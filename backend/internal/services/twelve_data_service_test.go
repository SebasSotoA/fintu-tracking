package services

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"fintu-tracking-backend/internal/models"
)

func TestFetchQuote_success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("symbol") != "AAPL" {
			t.Errorf("symbol = %q, want AAPL", r.URL.Query().Get("symbol"))
		}
		if r.URL.Query().Get("apikey") != "test-key" {
			t.Errorf("apikey not passed")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"symbol":"AAPL",
			"currency":"USD",
			"datetime":"2026-05-22",
			"close":"308.82001"
		}`))
	}))
	defer server.Close()

	svc := &TwelveDataService{
		apiKey:     "test-key",
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	price, day, currency, err := svc.FetchQuote(context.Background(), "aapl")
	if err != nil {
		t.Fatalf("FetchQuote() error = %v", err)
	}
	if price != "308.82001" {
		t.Errorf("price = %q, want 308.82001", price)
	}
	if day != "2026-05-22" {
		t.Errorf("day = %q, want 2026-05-22", day)
	}
	if currency != "USD" {
		t.Errorf("currency = %q, want USD", currency)
	}
}

func TestFetchQuote_rateLimitHTTP429(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"status":"error","code":429,"message":"API credits exhausted"}`))
	}))
	defer server.Close()

	svc := &TwelveDataService{
		apiKey:     "test-key",
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected rate limit error")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "rate limit") {
		t.Errorf("error = %q, want rate limit mention", err.Error())
	}
}

func TestFetchQuote_apiErrorBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"error","code":401,"message":"Invalid API key"}`))
	}))
	defer server.Close()

	svc := &TwelveDataService{
		apiKey:     "test-key",
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected API error")
	}
	if !strings.Contains(err.Error(), "Invalid API key") {
		t.Errorf("error = %q", err.Error())
	}
}

func TestFetchQuote_missingAPIKey(t *testing.T) {
	svc := &TwelveDataService{apiKey: ""}

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected missing key error")
	}
	if !strings.Contains(err.Error(), "TWELVE_DATA_API_KEY") {
		t.Errorf("error = %q", err.Error())
	}
}

func TestNewTwelveDataService_readsEnvKey(t *testing.T) {
	t.Setenv("TWELVE_DATA_API_KEY", "from-env")
	svc := NewTwelveDataService(nil)
	if svc.apiKey != "from-env" {
		t.Errorf("apiKey = %q, want from-env", svc.apiKey)
	}
}

func TestRefreshMarketPrices_skipsFreshTickers(t *testing.T) {
	store := newFakeMarketDataStore()
	store.heldTickers = []string{"AAPL", "MSFT"}
	store.marketPrices["AAPL"] = models.MarketPrice{Ticker: "AAPL", Price: "180.00", Currency: "USD", UpdatedAt: time.Now()}
	store.marketPrices["MSFT"] = models.MarketPrice{Ticker: "MSFT", Price: "330.00", Currency: "USD", UpdatedAt: time.Now()}

	svc := &TwelveDataService{store: store}
	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0", result.Updated)
	}
	if len(store.upsertPriceCalls) != 0 {
		t.Errorf("expected no upsert calls, got %d", len(store.upsertPriceCalls))
	}
}

func TestRefreshMarketPrices_fetchesOnlyStaleTickers(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		symbol := r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")
		switch symbol {
		case "AAPL":
			_, _ = w.Write([]byte(`{"symbol":"AAPL","currency":"USD","datetime":"2026-06-27","close":"181.00"}`))
		case "MSFT":
			_, _ = w.Write([]byte(`{"symbol":"MSFT","currency":"USD","datetime":"2026-06-27","close":"331.00"}`))
		default:
			t.Errorf("unexpected symbol: %s", symbol)
		}
	}))
	defer server.Close()

	store := newFakeMarketDataStore()
	store.heldTickers = []string{"AAPL", "MSFT"}
	store.marketPrices["AAPL"] = models.MarketPrice{Ticker: "AAPL", Price: "180.00", Currency: "USD", UpdatedAt: time.Now().Add(-48 * time.Hour)}
	store.marketPrices["MSFT"] = models.MarketPrice{Ticker: "MSFT", Price: "330.00", Currency: "USD", UpdatedAt: time.Now()}

	svc := &TwelveDataService{
		store:      store,
		apiKey:     "test-key",
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Updated != 1 {
		t.Errorf("updated = %d, want 1", result.Updated)
	}
	if len(result.Tickers) != 1 || result.Tickers[0] != "AAPL" {
		t.Errorf("tickers = %v, want [AAPL]", result.Tickers)
	}
	if len(store.upsertPriceCalls) != 1 || store.upsertPriceCalls[0].ticker != "AAPL" {
		t.Errorf("upsert calls = %v, want one AAPL call", store.upsertPriceCalls)
	}
}

func TestRefreshMarketPrices_handlesEmptyHoldings(t *testing.T) {
	store := newFakeMarketDataStore()
	svc := &TwelveDataService{store: store}
	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0", result.Updated)
	}
}

func TestRefreshMarketPrices_allowsFirstRefreshAndRecordsTimestamp(t *testing.T) {
	store := newFakeMarketDataStore()
	store.heldTickers = []string{"AAPL"}
	store.marketPrices["AAPL"] = models.MarketPrice{Ticker: "AAPL", Price: "180.00", Currency: "USD", UpdatedAt: time.Now()}

	svc := &TwelveDataService{store: store}

	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0", result.Updated)
	}

	refreshedAt, ok, err := store.GetLastMarketPriceRefresh(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("GetLastMarketPriceRefresh() error = %v", err)
	}
	if !ok {
		t.Fatal("expected refresh timestamp to be recorded")
	}
	if time.Since(refreshedAt) > time.Second {
		t.Errorf("refresh timestamp too old: %v", refreshedAt)
	}
}

func TestRefreshMarketPrices_rejectsDuringCooldown(t *testing.T) {
	store := newFakeMarketDataStore()
	store.lastRefresh["user-1"] = time.Now()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("unexpected API call during cooldown")
	}))
	defer server.Close()

	svc := &TwelveDataService{
		store:      store,
		apiKey:     "test-key",
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err == nil {
		t.Fatal("expected cooldown error")
	}

	var rateLimitErr *RateLimitError
	if !errors.As(err, &rateLimitErr) {
		t.Fatalf("expected *RateLimitError, got %T", err)
	}
	if rateLimitErr.RetryAfter <= 0 || rateLimitErr.RetryAfter > 60*time.Second {
		t.Errorf("retryAfter = %v, want between 0 and 60s", rateLimitErr.RetryAfter)
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0", result.Updated)
	}
}

func TestRefreshMarketPrices_propagatesRateLimit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		symbol := r.URL.Query().Get("symbol")
		if symbol == "AAPL" {
			_, _ = w.Write([]byte(`{"symbol":"AAPL","currency":"USD","datetime":"2026-06-27","close":"181.00"}`))
			return
		}
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"status":"error","code":429,"message":"API credits exhausted"}`))
	}))
	defer server.Close()

	store := newFakeMarketDataStore()
	store.heldTickers = []string{"AAPL", "MSFT"}

	svc := &TwelveDataService{
		store:      store,
		apiKey:     "test-key",
		httpClient: server.Client(),
		baseURL:    server.URL,
	}

	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err == nil {
		t.Fatal("expected rate limit error")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "rate limit") {
		t.Errorf("error = %q, want rate limit mention", err.Error())
	}
	if result.Updated != 1 {
		t.Errorf("updated = %d, want 1", result.Updated)
	}
	if len(result.Tickers) != 1 || result.Tickers[0] != "AAPL" {
		t.Errorf("tickers = %v, want [AAPL]", result.Tickers)
	}
}

