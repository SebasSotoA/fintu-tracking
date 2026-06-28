package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/models"
)

type fakeMarketDataStore struct {
	fxRates          map[string]RateResult
	latestFxRate     *RateResult
	marketPrices     map[string]models.MarketPrice
	heldTickers      []string
	lastRefresh      map[string]time.Time
	upsertFxCalls    []upsertFxCall
	upsertPriceCalls []upsertPriceCall
}

type upsertFxCall struct {
	userID string
	date   time.Time
	rate   string
	source string
}

type upsertPriceCall struct {
	ticker   string
	price    string
	currency string
}

func newFakeMarketDataStore() *fakeMarketDataStore {
	return &fakeMarketDataStore{
		fxRates:     make(map[string]RateResult),
		marketPrices: make(map[string]models.MarketPrice),
		lastRefresh: make(map[string]time.Time),
	}
}

func (f *fakeMarketDataStore) GetFxRate(_ context.Context, userID, date, source string) (RateResult, bool, error) {
	key := userID + "|" + date + "|" + source
	row, ok := f.fxRates[key]
	return row, ok, nil
}

func (f *fakeMarketDataStore) UpsertFxRate(_ context.Context, userID string, date time.Time, rate, source string) error {
	f.upsertFxCalls = append(f.upsertFxCalls, upsertFxCall{userID: userID, date: date, rate: rate, source: source})
	key := userID + "|" + date.Format("2006-01-02") + "|" + source
	f.fxRates[key] = RateResult{Rate: rate, Date: date.Format("2006-01-02"), Source: source, CachedAt: time.Now()}
	return nil
}

func (f *fakeMarketDataStore) GetLatestFxRate(_ context.Context, userID string) (RateResult, bool, error) {
	if f.latestFxRate != nil && f.latestFxRate.Source != "" {
		return *f.latestFxRate, true, nil
	}
	return RateResult{}, false, nil
}

func (f *fakeMarketDataStore) ListHeldTickers(_ context.Context, userID string) ([]string, error) {
	return f.heldTickers, nil
}

func (f *fakeMarketDataStore) GetMarketPrice(_ context.Context, ticker string) (models.MarketPrice, bool, error) {
	price, ok := f.marketPrices[ticker]
	return price, ok, nil
}

func (f *fakeMarketDataStore) GetMarketPrices(_ context.Context, tickers []string) ([]models.MarketPrice, error) {
	prices := make([]models.MarketPrice, 0, len(tickers))
	for _, ticker := range tickers {
		if price, ok := f.marketPrices[ticker]; ok {
			prices = append(prices, price)
		}
	}
	return prices, nil
}

func (f *fakeMarketDataStore) UpsertMarketPrice(_ context.Context, ticker, price, currency string) error {
	f.upsertPriceCalls = append(f.upsertPriceCalls, upsertPriceCall{ticker: ticker, price: price, currency: currency})
	f.marketPrices[ticker] = models.MarketPrice{Ticker: ticker, Price: price, Currency: currency, UpdatedAt: time.Now()}
	return nil
}

func (f *fakeMarketDataStore) RecordMarketPriceRefresh(_ context.Context, userID string) error {
	f.lastRefresh[userID] = time.Now()
	return nil
}

func (f *fakeMarketDataStore) GetLastMarketPriceRefresh(_ context.Context, userID string) (time.Time, bool, error) {
	refreshedAt, ok := f.lastRefresh[userID]
	return refreshedAt, ok, nil
}

func TestFetchCurrentRate_returnsFreshCachedRateWithoutCallingAPI(t *testing.T) {
	t.Setenv("TWELVE_DATA_API_KEY", "should-not-be-used")

	today := time.Now().UTC().Format("2006-01-02")
	store := newFakeMarketDataStore()
	store.fxRates["user-1|"+today+"|twelve-data"] = RateResult{
		Rate:     "4200.00",
		Date:     today,
		Source:   config.TwelveDataSource,
		CachedAt: time.Now(),
	}

	svc := &ExchangeRateService{store: store}

	result, err := svc.FetchCurrentRate(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Rate != "4200.00" {
		t.Errorf("rate = %q, want 4200.00", result.Rate)
	}
	if result.Source != config.TwelveDataSource {
		t.Errorf("source = %q, want twelve-data", result.Source)
	}
	if len(store.upsertFxCalls) != 0 {
		t.Errorf("expected no upsert calls, got %d", len(store.upsertFxCalls))
	}
}

func TestFetchCurrentRate_callsAPIAndStoresResultWhenCacheMiss(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/exchange_rate") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("symbol") != config.DefaultCurrencyPair {
			t.Errorf("symbol = %q, want %s", r.URL.Query().Get("symbol"), config.DefaultCurrencyPair)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"symbol":"USD/COP","rate":4185.5}`))
	}))
	defer server.Close()

	store := newFakeMarketDataStore()
	svc := &ExchangeRateService{
		store:      store,
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	t.Setenv("TWELVE_DATA_API_KEY", "test-key")
	result, err := svc.FetchCurrentRate(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Rate != "4185.50" {
		t.Errorf("rate = %q, want 4185.50", result.Rate)
	}
	if result.Source != config.TwelveDataSource {
		t.Errorf("source = %q, want twelve-data", result.Source)
	}
	if len(store.upsertFxCalls) != 1 {
		t.Fatalf("expected 1 upsert call, got %d", len(store.upsertFxCalls))
	}
	if store.upsertFxCalls[0].source != config.TwelveDataSource {
		t.Errorf("upsert source = %q, want twelve-data", store.upsertFxCalls[0].source)
	}
}

func TestFetchCurrentRate_refetchesWhenCacheIsStale(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"symbol":"USD/COP","rate":4190.0}`))
	}))
	defer server.Close()

	today := time.Now().UTC().Format("2006-01-02")
	store := newFakeMarketDataStore()
	store.fxRates["user-1|"+today+"|twelve-data"] = RateResult{
		Rate:     "4100.00",
		Date:     today,
		Source:   config.TwelveDataSource,
		CachedAt: time.Now().Add(-48 * time.Hour),
	}

	svc := &ExchangeRateService{
		store:      store,
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	t.Setenv("TWELVE_DATA_API_KEY", "test-key")
	result, err := svc.FetchCurrentRate(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Rate != "4190.00" {
		t.Errorf("rate = %q, want 4190.00", result.Rate)
	}
	if len(store.upsertFxCalls) != 1 {
		t.Fatalf("expected 1 upsert call, got %d", len(store.upsertFxCalls))
	}
}

func TestFetchCurrentRate_manualRowIsNotATwelveDataCacheHit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"symbol":"USD/COP","rate":4185.0}`))
	}))
	defer server.Close()

	today := time.Now().UTC().Format("2006-01-02")
	store := newFakeMarketDataStore()
	store.fxRates["user-1|"+today+"|manual"] = RateResult{
		Rate:     "4000.00",
		Date:     today,
		Source:   "manual",
		CachedAt: time.Now(),
	}

	svc := &ExchangeRateService{
		store:      store,
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	t.Setenv("TWELVE_DATA_API_KEY", "test-key")
	result, err := svc.FetchCurrentRate(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Rate != "4185.00" {
		t.Errorf("rate = %q, want 4185.00", result.Rate)
	}
	if result.Source != config.TwelveDataSource {
		t.Errorf("source = %q, want twelve-data", result.Source)
	}
}

func TestFetchCurrentRate_fallsBackToLatestRowOnAPIFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"status":"error","code":429,"message":"API credits exhausted"}`))
	}))
	defer server.Close()

	store := newFakeMarketDataStore()
	store.latestFxRate = &RateResult{
		Rate:   "4150.00",
		Date:   "2026-06-26",
		Source: "manual",
	}

	svc := &ExchangeRateService{
		store:      store,
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	t.Setenv("TWELVE_DATA_API_KEY", "test-key")
	result, err := svc.FetchCurrentRate(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Rate != "4150.00" {
		t.Errorf("rate = %q, want 4150.00", result.Rate)
	}
}

func TestFetchDailyHistory_buildsCorrectURL(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/time_series") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("symbol") != config.DefaultCurrencyPair {
			t.Errorf("symbol = %q, want %s", r.URL.Query().Get("symbol"), config.DefaultCurrencyPair)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","values":[{"datetime":"2026-06-25","close":"4175.50"}]}`))
	}))
	defer server.Close()

	svc := &ExchangeRateService{
		store:      newFakeMarketDataStore(),
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	t.Setenv("TWELVE_DATA_API_KEY", "test-key")
	points, err := svc.FetchDailyHistory(context.Background(), 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(points) != 1 {
		t.Fatalf("expected 1 point, got %d", len(points))
	}
	if points[0].Rate != "4175.50" {
		t.Errorf("rate = %q, want 4175.50", points[0].Rate)
	}
}
