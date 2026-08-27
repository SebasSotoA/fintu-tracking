package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"fintu-tracking-backend/internal/config"
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

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

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

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

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

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected API error")
	}
	if !strings.Contains(err.Error(), "Invalid API key") {
		t.Errorf("error = %q", err.Error())
	}
}

func TestFetchQuote_missingAPIKey(t *testing.T) {
	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = ""

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

	svc := NewTwelveDataService(store)
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
		if !strings.Contains(r.URL.Path, "/price") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		symbol := r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")
		switch symbol {
		case "AAPL":
			_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"}}`))
		default:
			t.Errorf("unexpected symbol: %s", symbol)
		}
	}))
	defer server.Close()

	store := newFakeMarketDataStore()
	store.heldTickers = []string{"AAPL", "MSFT"}
	store.marketPrices["AAPL"] = models.MarketPrice{Ticker: "AAPL", Price: "180.00", Currency: "USD", UpdatedAt: time.Now().Add(-48 * time.Hour)}
	store.marketPrices["MSFT"] = models.MarketPrice{Ticker: "MSFT", Price: "330.00", Currency: "USD", UpdatedAt: time.Now()}

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

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
	svc := NewTwelveDataService(store)
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

	svc := NewTwelveDataService(store)

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

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

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
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"status":"error","code":429,"message":"API credits exhausted"}`))
	}))
	defer server.Close()

	store := newFakeMarketDataStore()
	store.heldTickers = []string{"AAPL", "MSFT"}

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	result, err := svc.RefreshMarketPrices(context.Background(), "user-1")
	if err == nil {
		t.Fatal("expected rate limit error")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "rate limit") {
		t.Errorf("error = %q, want rate limit mention", err.Error())
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0", result.Updated)
	}
}

// --- FetchBatchPrices ---

func TestFetchBatchPrices_buildsBatchURLWithCommaSeparatedSymbols(t *testing.T) {
	var capturedPath, capturedSymbol string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.Path
		capturedSymbol = r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"150.25","currency":"USD"},"MSFT":{"price":"380.10","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	prices, err := svc.FetchBatchPrices(context.Background(), []string{"AAPL", "MSFT"})
	if err != nil {
		t.Fatalf("FetchBatchPrices() error = %v", err)
	}
	if capturedPath != "/price" {
		t.Errorf("path = %q, want /price", capturedPath)
	}
	if capturedSymbol != "AAPL,MSFT" {
		t.Errorf("symbol = %q, want AAPL,MSFT", capturedSymbol)
	}
	if len(prices) != 2 {
		t.Fatalf("prices len = %d, want 2", len(prices))
	}
	if prices["AAPL"].Price != "150.25" {
		t.Errorf("AAPL price = %q, want 150.25", prices["AAPL"].Price)
	}
	if prices["MSFT"].Price != "380.10" {
		t.Errorf("MSFT price = %q, want 380.10", prices["MSFT"].Price)
	}
	if prices["AAPL"].Currency != "USD" {
		t.Errorf("AAPL currency = %q, want USD", prices["AAPL"].Currency)
	}
}

func TestFetchBatchPrices_splitsWhenTickersExceedMaxBatch(t *testing.T) {
	var requestCount atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount.Add(1)
		symbol := r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")

		tickers := strings.Split(symbol, ",")
		resp := map[string]struct {
			Price    string `json:"price"`
			Currency string `json:"currency"`
		}{}
		for _, tk := range tickers {
			resp[tk] = struct {
				Price    string `json:"price"`
				Currency string `json:"currency"`
			}{Price: "100.00", Currency: "USD"}
		}
		rawBytes, _ := json.Marshal(resp)
		_, _ = w.Write(rawBytes)
	}))
	defer server.Close()

	tickers := make([]string, 0, 25)
	for i := 0; i < 25; i++ {
		tickers = append(tickers, fmt.Sprintf("T%02d", i))
	}

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	prices, err := svc.FetchBatchPrices(context.Background(), tickers)
	if err != nil {
		t.Fatalf("FetchBatchPrices() error = %v", err)
	}

	got := int(requestCount.Load())
	if got != 2 {
		t.Fatalf("request count = %d, want 2 (25 tickers / %d max batch)", got, config.MaxBatchSymbols)
	}
	if len(prices) != 25 {
		t.Errorf("prices len = %d, want 25", len(prices))
	}
}

func TestFetchBatchPrices_returnsRateLimitErrorOnHTTP429(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"status":"error","message":"API credits exhausted"}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	_, err := svc.FetchBatchPrices(context.Background(), []string{"AAPL"})
	if err == nil {
		t.Fatal("expected error")
	}
	var rateErr *RateLimitError
	if !errors.As(err, &rateErr) {
		t.Fatalf("expected *RateLimitError, got %T: %v", err, err)
	}
}

func TestFetchBatchPrices_missingAPIKeyReturnsError(t *testing.T) {
	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = ""

	_, err := svc.FetchBatchPrices(context.Background(), []string{"AAPL"})
	if err == nil {
		t.Fatal("expected missing key error")
	}
	if !strings.Contains(err.Error(), "TWELVE_DATA_API_KEY") {
		t.Errorf("error = %q, want TWELVE_DATA_API_KEY mention", err.Error())
	}
}

func TestFetchBatchPrices_normalizesAndDedupsTickers(t *testing.T) {
	var capturedSymbol string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedSymbol = r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"150.25","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	prices, err := svc.FetchBatchPrices(context.Background(), []string{"aapl", " AAPL "})
	if err != nil {
		t.Fatalf("FetchBatchPrices() error = %v", err)
	}
	if !strings.Contains(capturedSymbol, "AAPL") {
		t.Errorf("symbol = %q, want uppercased AAPL", capturedSymbol)
	}
	if _, ok := prices["AAPL"]; !ok {
		t.Errorf("expected AAPL in prices, got %v", prices)
	}
}

// --- ListAllHeldTickers (fake verification) ---

func TestListAllHeldTickers_fakeIncludesSPY(t *testing.T) {
	store := newFakeMarketDataStore()
	tickers, err := store.ListAllHeldTickers(context.Background())
	if err != nil {
		t.Fatalf("ListAllHeldTickers() error = %v", err)
	}
	hasSPY := false
	for _, tk := range tickers {
		if tk == "SPY" {
			hasSPY = true
		}
	}
	if !hasSPY {
		t.Errorf("ListAllHeldTickers() = %v, want SPY included", tickers)
	}
}

func TestListAllHeldTickers_fakeRespectsConfiguredValue(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"VOO", "QQQ", "SPY"}

	tickers, err := store.ListAllHeldTickers(context.Background())
	if err != nil {
		t.Fatalf("ListAllHeldTickers() error = %v", err)
	}
	if len(tickers) != 3 {
		t.Errorf("tickers len = %d, want 3", len(tickers))
	}
	if tickers[2] != "SPY" {
		t.Errorf("last ticker = %q, want SPY", tickers[2])
	}
}

// --- RefreshAllMarketPrices ---

func TestRefreshAllMarketPrices_callsListAllHeldTickersNotListHeldTickers(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"AAPL", "MSFT", "SPY"}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"},"MSFT":{"price":"330.00","currency":"USD"},"SPY":{"price":"500.00","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	result, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("RefreshAllMarketPrices() error = %v", err)
	}
	if result.Updated != 3 {
		t.Errorf("updated = %d, want 3", result.Updated)
	}
}

func TestRefreshAllMarketPrices_doesNotCallRecordMarketPriceRefresh(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"AAPL", "SPY"}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"},"SPY":{"price":"500.00","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	_, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("RefreshAllMarketPrices() error = %v", err)
	}
	if len(store.refreshCalls) != 0 {
		t.Errorf("expected no RecordMarketPriceRefresh calls, got %d (%v)", len(store.refreshCalls), store.refreshCalls)
	}
}

func TestRefreshAllMarketPrices_upsertsAllPrices(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"AAPL", "MSFT", "SPY"}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"},"MSFT":{"price":"330.00","currency":"USD"},"SPY":{"price":"500.00","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	result, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("RefreshAllMarketPrices() error = %v", err)
	}
	if result.Updated != 3 {
		t.Errorf("updated = %d, want 3", result.Updated)
	}
	if len(store.upsertPriceCalls) != 3 {
		t.Errorf("upsert calls = %d, want 3", len(store.upsertPriceCalls))
	}
	upserted := make(map[string]bool, len(store.upsertPriceCalls))
	for _, call := range store.upsertPriceCalls {
		upserted[call.ticker] = true
	}
	for _, want := range []string{"AAPL", "MSFT", "SPY"} {
		if !upserted[want] {
			t.Errorf("expected upsert for %s, got %v", want, upserted)
		}
	}
}

func TestRefreshAllMarketPrices_skipsAllWhenEverythingFresh(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"AAPL", "MSFT", "SPY"}
	now := time.Now()
	store.marketPrices["AAPL"] = models.MarketPrice{Ticker: "AAPL", Price: "180.00", Currency: "USD", UpdatedAt: now}
	store.marketPrices["MSFT"] = models.MarketPrice{Ticker: "MSFT", Price: "330.00", Currency: "USD", UpdatedAt: now}
	store.marketPrices["SPY"] = models.MarketPrice{Ticker: "SPY", Price: "500.00", Currency: "USD", UpdatedAt: now}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("unexpected API call when all prices are fresh")
	}))
	defer server.Close()

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	result, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("RefreshAllMarketPrices() error = %v", err)
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0 (all fresh)", result.Updated)
	}
	if result.Skipped != 3 {
		t.Errorf("skipped = %d, want 3", result.Skipped)
	}
	if len(store.upsertPriceCalls) != 0 {
		t.Errorf("upsert calls = %d, want 0", len(store.upsertPriceCalls))
	}
}

func TestRefreshAllMarketPrices_refreshesAllWhenStale(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"AAPL", "MSFT", "SPY"}
	staleTime := time.Now().Add(-48 * time.Hour)
	store.marketPrices["AAPL"] = models.MarketPrice{Ticker: "AAPL", Price: "180.00", Currency: "USD", UpdatedAt: staleTime}
	store.marketPrices["MSFT"] = models.MarketPrice{Ticker: "MSFT", Price: "330.00", Currency: "USD", UpdatedAt: staleTime}
	store.marketPrices["SPY"] = models.MarketPrice{Ticker: "SPY", Price: "500.00", Currency: "USD", UpdatedAt: staleTime}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"},"MSFT":{"price":"331.00","currency":"USD"},"SPY":{"price":"501.00","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	result, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("RefreshAllMarketPrices() error = %v", err)
	}
	if result.Updated != 3 {
		t.Errorf("updated = %d, want 3 (all stale)", result.Updated)
	}
	if result.Skipped != 0 {
		t.Errorf("skipped = %d, want 0", result.Skipped)
	}
}

func TestRefreshAllMarketPrices_handlesEmptyHeldTickers(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{}

	svc := NewTwelveDataService(store)
	result, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Updated != 0 {
		t.Errorf("updated = %d, want 0", result.Updated)
	}
}

func TestRefreshAllMarketPrices_noCooldownEnforced(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []string{"AAPL", "SPY"}
	store.lastRefresh["some-user"] = time.Now()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"},"SPY":{"price":"500.00","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(store)
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	result, err := svc.RefreshAllMarketPrices(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Updated != 2 {
		t.Errorf("updated = %d, want 2 (no cooldown)", result.Updated)
	}
}

