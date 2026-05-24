package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const defaultTwelveDataBaseURL = "https://api.twelvedata.com"

// RefreshResult summarizes a market price refresh run.
type RefreshResult struct {
	Updated int      `json:"updated"`
	Tickers []string `json:"tickers"`
	Errors  []string `json:"errors"`
}

// TwelveDataService fetches equity quotes from Twelve Data and upserts market_prices.
type TwelveDataService struct {
	apiKey     string
	httpClient *http.Client
	pool       *pgxpool.Pool
	baseURL    string
}

// NewTwelveDataService creates a service backed by the given DB pool.
func NewTwelveDataService(pool *pgxpool.Pool) *TwelveDataService {
	return &TwelveDataService{
		apiKey:     os.Getenv("TWELVE_DATA_API_KEY"),
		pool:       pool,
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    defaultTwelveDataBaseURL,
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
		base = defaultTwelveDataBaseURL
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
		currency = "USD"
	}

	return price, latestDay, currency, nil
}

// RefreshMarketPrices fetches quotes for all currently held tickers and upserts market_prices.
func (s *TwelveDataService) RefreshMarketPrices(ctx context.Context, userID string) (RefreshResult, error) {
	result := RefreshResult{
		Tickers: []string{},
		Errors:  []string{},
	}

	if s.pool == nil {
		return result, fmt.Errorf("database pool is not initialized")
	}

	tickers, err := s.listHeldTickers(ctx, userID)
	if err != nil {
		return result, err
	}

	if len(tickers) == 0 {
		return result, nil
	}

	for i, ticker := range tickers {
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

		if upsertErr := s.upsertMarketPrice(ctx, ticker, price, currency); upsertErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", ticker, upsertErr))
			continue
		}

		result.Updated++
		result.Tickers = append(result.Tickers, ticker)
	}

	return result, nil
}

func (s *TwelveDataService) listHeldTickers(ctx context.Context, userID string) ([]string, error) {
	query := `
		SELECT ticker
		FROM trades
		WHERE user_id = $1
		GROUP BY ticker
		HAVING SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) > 0
		ORDER BY ticker
	`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tickers := make([]string, 0)
	for rows.Next() {
		var ticker string
		if err := rows.Scan(&ticker); err != nil {
			return nil, err
		}
		tickers = append(tickers, ticker)
	}
	return tickers, rows.Err()
}

func (s *TwelveDataService) upsertMarketPrice(ctx context.Context, ticker, price, currency string) error {
	if currency == "" {
		currency = "USD"
	}
	query := `
		INSERT INTO market_prices (ticker, price, currency, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (ticker) DO UPDATE
		SET price = EXCLUDED.price, currency = EXCLUDED.currency, updated_at = NOW()
	`
	_, err := s.pool.Exec(ctx, query, ticker, price, currency)
	if err != nil {
		log.Printf("twelve_data_service: failed to upsert %s: %v", ticker, err)
	}
	return err
}
