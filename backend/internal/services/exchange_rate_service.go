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

	"fintu-tracking-backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// ExchangeRateService fetches USD/COP rates from Twelve Data using a shared
// Postgres TTL cache backed by the fx_rates table.
type ExchangeRateService struct {
	store      MarketDataStore
	httpClient *http.Client
	baseURL    string
}

// NewExchangeRateService creates a new ExchangeRateService backed by the given DB pool.
func NewExchangeRateService(pool *pgxpool.Pool) *ExchangeRateService {
	return &ExchangeRateService{
		store:      NewPostgresMarketDataStore(pool),
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    config.TwelveDataBaseURL,
	}
}

type twelveDataExchangeRateResponse struct {
	Symbol  string  `json:"symbol"`
	Rate    float64 `json:"rate"`
	Status  string  `json:"status"`
	Code    int     `json:"code"`
	Message string  `json:"message"`
}

// RateResult carries the exchange rate, the date it applies to, which source provided it,
// and when it was cached so callers can evaluate TTL freshness.
type RateResult struct {
	Rate     string
	Date     string
	Source   string
	CachedAt time.Time
}

// FxRateChartPoint is a single daily USD/COP close for charting.
type FxRateChartPoint struct {
	Date string `json:"date"`
	Rate string `json:"rate"`
}

type twelveDataTimeSeriesResponse struct {
	Status  string                    `json:"status"`
	Message string                    `json:"message"`
	Code    int                       `json:"code"`
	Values  []twelveDataTimeSeriesBar `json:"values"`
}

type twelveDataTimeSeriesBar struct {
	Datetime string `json:"datetime"`
	Close    string `json:"close"`
}

// FetchCurrentRate returns the USD→COP rate for today using the shared Postgres TTL cache.
//
//  1. Query fx_rates for a fresh Twelve-Data-sourced row for today.
//  2. If no fresh cached row exists, call Twelve Data and upsert the result.
//  3. If the API call fails, fall back to the most recent fx_rates row for the user.
func (s *ExchangeRateService) FetchCurrentRate(ctx context.Context, userID string) (RateResult, error) {
	today := time.Now().UTC()
	dateStr := today.Format("2006-01-02")

	if row, ok, err := s.store.GetFxRate(ctx, userID, dateStr, config.TwelveDataSource); err != nil {
		log.Printf("exchange_rate_service: failed to read cached rate: %v", err)
	} else if ok && isFresh(row.CachedAt, defaultCacheTTL()) {
		return row, nil
	}

	rate, err := s.fetchFromAPI(ctx)
	if err != nil {
		if row, ok, fallbackErr := s.store.GetLatestFxRate(ctx, userID); fallbackErr != nil {
			log.Printf("exchange_rate_service: failed to read fallback rate: %v", fallbackErr)
		} else if ok {
			return row, nil
		}
		return RateResult{}, fmt.Errorf("twelve data: %w", err)
	}

	if dbErr := s.store.UpsertFxRate(ctx, userID, today, rate, config.TwelveDataSource); dbErr != nil {
		log.Printf("exchange_rate_service: failed to persist rate to DB: %v", dbErr)
	}
	return RateResult{Rate: rate, Date: dateStr, Source: config.TwelveDataSource}, nil
}

func (s *ExchangeRateService) fetchFromAPI(ctx context.Context) (string, error) {
	apiKey := os.Getenv("TWELVE_DATA_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	base := s.baseURL
	if base == "" {
		base = config.TwelveDataBaseURL
	}

	apiURL := fmt.Sprintf(
		"%s/exchange_rate?symbol=%s&apikey=%s",
		strings.TrimRight(base, "/"),
		url.QueryEscape(config.DefaultCurrencyPair),
		url.QueryEscape(apiKey),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result twelveDataExchangeRateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return "", fmt.Errorf("rate limit: %s", result.errorMessage())
	}

	if strings.EqualFold(strings.TrimSpace(result.Status), "error") {
		return "", fmt.Errorf("API error: %s", result.errorMessage())
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned HTTP %d", resp.StatusCode)
	}

	if result.Rate <= 0 {
		return "", fmt.Errorf("missing or invalid rate in response")
	}

	return decimal.NewFromFloat(result.Rate).StringFixed(2), nil
}

func (r *twelveDataExchangeRateResponse) errorMessage() string {
	return twelveDataErrorMessage(r.Status, r.Code, r.Message)
}

func twelveDataErrorMessage(status string, code int, message string) string {
	if msg := strings.TrimSpace(message); msg != "" {
		return msg
	}
	if code != 0 {
		return fmt.Sprintf("code %d", code)
	}
	if strings.EqualFold(strings.TrimSpace(status), "error") {
		return "unknown API error"
	}
	return "unknown error"
}

// FetchDailyHistory returns daily USD/COP close prices from Twelve Data time_series.
func (s *ExchangeRateService) FetchDailyHistory(ctx context.Context, days int) ([]FxRateChartPoint, error) {
	if days <= 0 {
		days = config.DefaultFXRateDays
	}
	if days > config.MaxFXRateDays {
		days = config.MaxFXRateDays
	}

	apiKey := os.Getenv("TWELVE_DATA_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	base := s.baseURL
	if base == "" {
		base = config.TwelveDataBaseURL
	}

	apiURL := fmt.Sprintf(
		"%s/time_series?symbol=%s&interval=1day&outputsize=%d&order=asc&apikey=%s",
		strings.TrimRight(base, "/"),
		url.QueryEscape(config.DefaultCurrencyPair),
		days,
		url.QueryEscape(apiKey),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result twelveDataTimeSeriesResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("rate limit: %s", twelveDataErrorMessage(result.Status, result.Code, result.Message))
	}

	if strings.EqualFold(strings.TrimSpace(result.Status), "error") {
		return nil, fmt.Errorf("API error: %s", twelveDataErrorMessage(result.Status, result.Code, result.Message))
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned HTTP %d", resp.StatusCode)
	}

	points := make([]FxRateChartPoint, 0, len(result.Values))
	for _, bar := range result.Values {
		date := parseChartDate(bar.Datetime)
		if date == "" {
			continue
		}
		closeStr := strings.TrimSpace(bar.Close)
		if closeStr == "" {
			continue
		}
		closeDec, err := decimal.NewFromString(closeStr)
		if err != nil || !closeDec.GreaterThan(decimal.Zero) {
			continue
		}
		points = append(points, FxRateChartPoint{
			Date: date,
			Rate: closeDec.StringFixed(2),
		})
	}

	if len(points) == 0 {
		return nil, fmt.Errorf("no historical rate data returned")
	}

	return points, nil
}

func parseChartDate(datetime string) string {
	datetime = strings.TrimSpace(datetime)
	if len(datetime) >= 10 {
		return datetime[:10]
	}
	return ""
}
