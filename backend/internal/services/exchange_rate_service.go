package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// exchangeRateCacheEntry holds a fetched rate, its source, and the fetch time for TTL checks.
type exchangeRateCacheEntry struct {
	rate      string
	source    string
	fetchedAt time.Time
}

// ExchangeRateService fetches USD/COP rates from ExchangeRate-API with a two-layer cache:
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

// exchangeRateAPIResponse is the subset of fields we need from ExchangeRate-API v6.
type exchangeRateAPIResponse struct {
	Result         string  `json:"result"`
	ConversionRate float64 `json:"conversion_rate"`
	ErrorType      string  `json:"error-type"`
}

// RateResult carries the exchange rate, the date it applies to, and which source provided it.
type RateResult struct {
	Rate   string
	Date   string
	Source string
}

// FetchCurrentRate returns the USD→COP rate for today using the cache hierarchy:
//  1. In-memory cache (if entry exists and is within TTL)
//  2. Postgres fx_rates row for today (populates memory cache on hit)
//  3. ExchangeRate-API HTTP call (stores result in both layers)
//
// If the API call fails, the most recent rate stored in the DB is returned as a fallback.
func (s *ExchangeRateService) FetchCurrentRate(ctx context.Context, userID string) (RateResult, error) {
	today := time.Now().UTC()
	dateStr := today.Format("2006-01-02")

	// Layer 1 — in-memory cache.
	if row, ok := s.fromMemory(dateStr); ok {
		return row, nil
	}

	// Layer 2 — database (per-user row for today).
	if row, ok := s.fromDB(ctx, userID, dateStr); ok {
		s.storeMemory(dateStr, row.Rate, row.Source)
		return row, nil
	}

	// Layer 3 — external API.
	rate, err := s.fetchFromAPI(ctx)
	if err != nil {
		// Graceful fallback: return the most recent rate we have in the DB.
		if row, ok := s.latestFromDB(ctx, userID); ok {
			return row, nil
		}
		return RateResult{}, fmt.Errorf("exchangerate-api: %w", err)
	}

	const apiSource = "exchangerate-api"

	// Persist to DB and warm both cache layers.
	if dbErr := s.storeInDB(ctx, userID, today, rate); dbErr != nil {
		log.Printf("exchange_rate_service: failed to persist rate to DB: %v", dbErr)
	}
	s.storeMemory(dateStr, rate, apiSource)
	return RateResult{Rate: rate, Date: dateStr, Source: apiSource}, nil
}

// fromMemory returns (RateResult, true) when a valid, non-expired entry exists for date.
func (s *ExchangeRateService) fromMemory(date string) (RateResult, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, ok := s.cache[date]
	if !ok || time.Since(entry.fetchedAt) > cacheTTL {
		return RateResult{}, false
	}
	return RateResult{Rate: entry.rate, Date: date, Source: entry.source}, true
}

// storeMemory writes a rate and its source to the in-memory cache under the given date key.
func (s *ExchangeRateService) storeMemory(date, rate, source string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[date] = exchangeRateCacheEntry{rate: rate, source: source, fetchedAt: time.Now()}
}

// fromDB queries fx_rates for an API-sourced row for the given user and date.
// Returns (RateResult{}, false) when the pool is nil or no row is found.
func (s *ExchangeRateService) fromDB(ctx context.Context, userID, date string) (RateResult, bool) {
	if s.pool == nil {
		return RateResult{}, false
	}
	var rate, source string
	query := `
		SELECT rate, source FROM fx_rates
		WHERE user_id = $1 AND date = $2 AND source = 'exchangerate-api'
		LIMIT 1
	`
	err := s.pool.QueryRow(ctx, query, userID, date).Scan(&rate, &source)
	if err != nil {
		return RateResult{}, false
	}
	return RateResult{Rate: rate, Date: date, Source: source}, true
}

// latestFromDB returns the most recently recorded rate for the given user regardless of source.
// Returns (RateResult{}, false) when the pool is nil or no row is found.
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

// storeInDB upserts an API-sourced rate into fx_rates for the given user and date.
func (s *ExchangeRateService) storeInDB(ctx context.Context, userID string, date time.Time, rate string) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}
	id := uuid.New().String()
	query := `
		INSERT INTO fx_rates (id, user_id, date, rate, source)
		VALUES ($1, $2, $3, $4, 'exchangerate-api')
		ON CONFLICT (user_id, date)
		DO UPDATE SET rate = $4, source = 'exchangerate-api'
	`
	_, err := s.pool.Exec(ctx, query, id, userID, date, rate)
	return err
}

// fetchFromAPI calls ExchangeRate-API and returns the USD→COP conversion rate as a string.
func (s *ExchangeRateService) fetchFromAPI(ctx context.Context) (string, error) {
	apiKey := os.Getenv("EXCHANGERATE_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("EXCHANGERATE_API_KEY environment variable is not set")
	}

	url := fmt.Sprintf("https://v6.exchangerate-api.com/v6/%s/pair/USD/COP", apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Drain to allow connection reuse even on error.
		io.Copy(io.Discard, resp.Body) //nolint:errcheck
		return "", fmt.Errorf("API returned HTTP %d", resp.StatusCode)
	}

	var result exchangeRateAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}
	// Drain any remaining bytes so the transport can reuse the connection.
	io.Copy(io.Discard, resp.Body) //nolint:errcheck

	if result.Result != "success" {
		return "", fmt.Errorf("API returned error: %s", result.ErrorType)
	}

	rate := decimal.NewFromFloat(result.ConversionRate).StringFixed(2)
	return rate, nil
}
