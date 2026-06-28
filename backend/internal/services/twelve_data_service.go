package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"fintu-tracking-backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RefreshResult summarizes a market price refresh run.
type RefreshResult struct {
	Updated int      `json:"updated"`
	Tickers []string `json:"tickers"`
	Errors  []string `json:"errors"`
}

// TwelveDataService fetches equity quotes from Twelve Data and upserts market_prices
// through the shared Postgres TTL cache.
type TwelveDataService struct {
	apiKey     string
	httpClient *http.Client
	store      MarketDataStore
	baseURL    string
}

// NewTwelveDataService creates a service backed by the given DB pool.
func NewTwelveDataService(pool *pgxpool.Pool) *TwelveDataService {
	return &TwelveDataService{
		apiKey:     os.Getenv("TWELVE_DATA_API_KEY"),
		store:      NewPostgresMarketDataStore(pool),
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    config.TwelveDataBaseURL,
	}
}

type quoteResponse struct {
	Symbol   string `json:"symbol"`
	Currency string `json:"currency"`
	Datetime string `json:"datetime"`
	Close    string `json:"close"`
	Status   string `json:"status"`
	Code     int    `json:"code"`
	Message  string `json:"message"`
}

func (r *quoteResponse) isError() bool {
	return strings.EqualFold(strings.TrimSpace(r.Status), "error")
}

func (r *quoteResponse) errorMessage() string {
	if msg := strings.TrimSpace(r.Message); msg != "" {
		return msg
	}
	if r.Code != 0 {
		return fmt.Sprintf("API error (code %d)", r.Code)
	}
	return "unknown API error"
}

// FetchQuote returns the latest price, trading day, and currency via the /quote endpoint.
func (s *TwelveDataService) FetchQuote(ctx context.Context, ticker string) (price, latestDay, currency string, err error) {
	if s.apiKey == "" {
		return "", "", "", fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	ticker = strings.TrimSpace(strings.ToUpper(ticker))
	if ticker == "" {
		return "", "", "", fmt.Errorf("ticker is required")
	}

	base := s.baseURL
	if base == "" {
		base = config.TwelveDataBaseURL
	}

	apiURL := fmt.Sprintf(
		"%s/quote?symbol=%s&apikey=%s",
		strings.TrimRight(base, "/"),
		url.QueryEscape(ticker),
		url.QueryEscape(s.apiKey),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", "", "", err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", "", fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to read response: %w", err)
	}

	var result quoteResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", "", fmt.Errorf("failed to decode response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return "", "", "", fmt.Errorf("twelve data rate limit: %s", result.errorMessage())
	}

	if result.isError() {
		if result.Code == http.StatusTooManyRequests {
			return "", "", "", fmt.Errorf("twelve data rate limit: %s", result.errorMessage())
		}
		return "", "", "", fmt.Errorf("twelve data API error: %s", result.errorMessage())
	}

	if resp.StatusCode != http.StatusOK {
		return "", "", "", fmt.Errorf("API returned HTTP %d", resp.StatusCode)
	}

	price = strings.TrimSpace(result.Close)
	if price == "" {
		return "", "", "", fmt.Errorf("missing close price in quote for %s", ticker)
	}

	latestDay = strings.TrimSpace(result.Datetime)
	currency = strings.TrimSpace(result.Currency)
	if currency == "" {
		currency = config.DefaultMarketCurrency
	}

	return price, latestDay, currency, nil
}

// RefreshMarketPrices fetches quotes for held tickers whose cached prices are stale or
// missing, then upserts market_prices. Tickers with fresh cached prices are skipped.
func (s *TwelveDataService) RefreshMarketPrices(ctx context.Context, userID string) (RefreshResult, error) {
	result := RefreshResult{
		Tickers: []string{},
		Errors:  []string{},
	}

	if err := s.checkCooldown(ctx, userID); err != nil {
		return result, err
	}

	tickers, err := s.store.ListHeldTickers(ctx, userID)
	if err != nil {
		return result, err
	}

	if len(tickers) == 0 {
		return result, nil
	}

	staleTickers, err := s.listStaleTickers(ctx, tickers)
	if err != nil {
		return result, err
	}

	for i, ticker := range staleTickers {
		if i > 0 {
			select {
			case <-ctx.Done():
				return result, ctx.Err()
			case <-time.After(500 * time.Millisecond):
			}
		}

		price, _, currency, fetchErr := s.FetchQuote(ctx, ticker)
		if fetchErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", ticker, fetchErr))
			if strings.Contains(strings.ToLower(fetchErr.Error()), "rate limit") {
				return result, fetchErr
			}
			continue
		}

		if upsertErr := s.store.UpsertMarketPrice(ctx, ticker, price, currency); upsertErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", ticker, upsertErr))
			continue
		}

		result.Updated++
		result.Tickers = append(result.Tickers, ticker)
	}

	if recordErr := s.store.RecordMarketPriceRefresh(ctx, userID); recordErr != nil {
		return result, fmt.Errorf("record refresh: %w", recordErr)
	}

	return result, nil
}

// checkCooldown returns a RateLimitError if the user has refreshed prices too recently.
func (s *TwelveDataService) checkCooldown(ctx context.Context, userID string) error {
	lastRefresh, ok, err := s.store.GetLastMarketPriceRefresh(ctx, userID)
	if err != nil {
		return fmt.Errorf("check cooldown: %w", err)
	}
	if !ok {
		return nil
	}

	elapsed := time.Since(lastRefresh)
	cooldown := defaultMarketPriceCooldown()
	if elapsed < cooldown {
		return &RateLimitError{RetryAfter: cooldown - elapsed}
	}
	return nil
}

// listStaleTickers returns tickers that have no cached market price or whose cached
// price is older than the configured TTL.
func (s *TwelveDataService) listStaleTickers(ctx context.Context, tickers []string) ([]string, error) {
	prices, err := s.store.GetMarketPrices(ctx, tickers)
	if err != nil {
		return nil, err
	}

	fresh := make(map[string]bool, len(prices))
	for _, price := range prices {
		if isFresh(price.UpdatedAt, defaultCacheTTL()) {
			fresh[price.Ticker] = true
		}
	}

	stale := make([]string, 0, len(tickers))
	for _, ticker := range tickers {
		if !fresh[ticker] {
			stale = append(stale, ticker)
		}
	}
	return stale, nil
}
