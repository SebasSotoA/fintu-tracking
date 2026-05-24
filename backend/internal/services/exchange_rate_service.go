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
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

const twelveDataAPISource = "twelve-data"

// exchangeRateCacheEntry holds a fetched rate, its source, and the fetch time for TTL checks.
type exchangeRateCacheEntry struct {
	rate      string
	source    string
	fetchedAt time.Time
}

// ExchangeRateService fetches USD/COP rates from Twelve Data with a two-layer cache:
//  1. In-memory map keyed by date string (resets on restart)
//  2. Postgres fx_rates table (persists across restarts)
//
// The external API is only called when neither cache layer has today's rate.
type ExchangeRateService struct {
	mu         sync.RWMutex
	cache      map[string]exchangeRateCacheEntry // key: "YYYY-MM-DD"
	pool       *pgxpool.Pool
	httpClient *http.Client
}

// NewExchangeRateService creates a new ExchangeRateService backed by the given DB pool.
func NewExchangeRateService(pool *pgxpool.Pool) *ExchangeRateService {
	return &ExchangeRateService{
		cache:      make(map[string]exchangeRateCacheEntry),
		pool:       pool,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

const cacheTTL = 24 * time.Hour

type twelveDataExchangeRateResponse struct {
	Symbol  string  `json:"symbol"`
	Rate    float64 `json:"rate"`
	Status  string  `json:"status"`
	Code    int     `json:"code"`
	Message string  `json:"message"`
}

// RateResult carries the exchange rate, the date it applies to, and which source provided it.
type RateResult struct {
	Rate   string
	Date   string
	Source string
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

// FetchCurrentRate returns the USD→COP rate for today using the cache hierarchy:
//  1. In-memory cache (if entry exists and is within TTL)
//  2. Postgres fx_rates row for today (populates memory cache on hit)
//  3. Twelve Data /exchange_rate HTTP call (stores result in both layers)
//
// If the API call fails, the most recent rate stored in the DB is returned as a fallback.
func (s *ExchangeRateService) FetchCurrentRate(ctx context.Context, userID string) (RateResult, error) {
	today := time.Now().UTC()
	dateStr := today.Format("2006-01-02")

	if row, ok := s.fromMemory(dateStr); ok {
		return row, nil
	}

	if row, ok := s.fromDB(ctx, userID, dateStr); ok {
		s.storeMemory(dateStr, row.Rate, row.Source)
		return row, nil
	}

	rate, err := s.fetchFromAPI(ctx)
	if err != nil {
		if row, ok := s.latestFromDB(ctx, userID); ok {
			return row, nil
		}
		return RateResult{}, fmt.Errorf("twelve data: %w", err)
	}

	if dbErr := s.storeInDB(ctx, userID, today, rate); dbErr != nil {
		log.Printf("exchange_rate_service: failed to persist rate to DB: %v", dbErr)
	}
	s.storeMemory(dateStr, rate, twelveDataAPISource)
	return RateResult{Rate: rate, Date: dateStr, Source: twelveDataAPISource}, nil
}

func (s *ExchangeRateService) fromMemory(date string) (RateResult, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, ok := s.cache[date]
	if !ok || time.Since(entry.fetchedAt) > cacheTTL {
		return RateResult{}, false
	}
	return RateResult{Rate: entry.rate, Date: date, Source: entry.source}, true
}

func (s *ExchangeRateService) storeMemory(date, rate, source string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[date] = exchangeRateCacheEntry{rate: rate, source: source, fetchedAt: time.Now()}
}

func (s *ExchangeRateService) fromDB(ctx context.Context, userID, date string) (RateResult, bool) {
	if s.pool == nil {
		return RateResult{}, false
	}
	var rate, source string
	query := `
		SELECT rate, source FROM fx_rates
		WHERE user_id = $1 AND date = $2 AND source = $3
		LIMIT 1
	`
	err := s.pool.QueryRow(ctx, query, userID, date, twelveDataAPISource).Scan(&rate, &source)
	if err != nil {
		return RateResult{}, false
	}
	return RateResult{Rate: rate, Date: date, Source: source}, true
}

func (s *ExchangeRateService) latestFromDB(ctx context.Context, userID string) (RateResult, bool) {
	if s.pool == nil {
		return RateResult{}, false
	}
	var rate, source string
	query := `SELECT rate, source FROM fx_rates WHERE user_id = $1 ORDER BY date DESC LIMIT 1`
	err := s.pool.QueryRow(ctx, query, userID).Scan(&rate, &source)
	if err != nil {
		return RateResult{}, false
	}
	today := time.Now().UTC().Format("2006-01-02")
	return RateResult{Rate: rate, Date: today, Source: source}, true
}

func (s *ExchangeRateService) storeInDB(ctx context.Context, userID string, date time.Time, rate string) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}
	id := uuid.New().String()
	query := `
		INSERT INTO fx_rates (id, user_id, date, rate, source)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, date)
		DO UPDATE SET rate = $4, source = $5
	`
	_, err := s.pool.Exec(ctx, query, id, userID, date, rate, twelveDataAPISource)
	return err
}

func (s *ExchangeRateService) fetchFromAPI(ctx context.Context) (string, error) {
	apiKey := os.Getenv("TWELVE_DATA_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	apiURL := fmt.Sprintf(
		"https://api.twelvedata.com/exchange_rate?symbol=%s&apikey=%s",
		url.QueryEscape("USD/COP"),
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
		days = 30
	}
	if days > 90 {
		days = 90
	}

	apiKey := os.Getenv("TWELVE_DATA_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	apiURL := fmt.Sprintf(
		"https://api.twelvedata.com/time_series?symbol=%s&interval=1day&outputsize=%d&order=asc&apikey=%s",
		url.QueryEscape("USD/COP"),
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
