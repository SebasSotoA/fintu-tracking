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

	price, day, currency, err := svc.FetchQuote(context.Background(), "aapl", "")
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

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL", "")
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

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL", "")
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

	_, _, _, err := svc.FetchQuote(context.Background(), "AAPL", "")
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
	store.heldTickers = []HeldTicker{{Ticker: "AAPL", AssetType: "stock"}, {Ticker: "MSFT", AssetType: "stock"}}
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
	store.heldTickers = []HeldTicker{{Ticker: "AAPL", AssetType: "stock"}, {Ticker: "MSFT", AssetType: "stock"}}
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
	store.heldTickers = []HeldTicker{{Ticker: "AAPL", AssetType: "stock"}}
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
	store.heldTickers = []HeldTicker{{Ticker: "AAPL", AssetType: "stock"}, {Ticker: "MSFT", AssetType: "stock"}}

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

	prices, err := svc.FetchBatchPrices(context.Background(), []HeldTicker{{Ticker: "AAPL"}, {Ticker: "MSFT"}})
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

	tickers := make([]HeldTicker, 0, 25)
	for i := 0; i < 25; i++ {
		tickers = append(tickers, HeldTicker{Ticker: fmt.Sprintf("T%02d", i)})
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

	_, err := svc.FetchBatchPrices(context.Background(), []HeldTicker{{Ticker: "AAPL"}})
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

	_, err := svc.FetchBatchPrices(context.Background(), []HeldTicker{{Ticker: "AAPL"}})
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

	prices, err := svc.FetchBatchPrices(context.Background(), []HeldTicker{{Ticker: "aapl"}, {Ticker: " AAPL "}})
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
	for _, ht := range tickers {
		if ht.Ticker == "SPY" {
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
	store.allHeldTickers = []HeldTicker{
		{Ticker: "VOO", AssetType: "etf"},
		{Ticker: "QQQ", AssetType: "etf"},
		{Ticker: "SPY", AssetType: "etf"},
	}

	tickers, err := store.ListAllHeldTickers(context.Background())
	if err != nil {
		t.Fatalf("ListAllHeldTickers() error = %v", err)
	}
	if len(tickers) != 3 {
		t.Errorf("tickers len = %d, want 3", len(tickers))
	}
	if tickers[2].Ticker != "SPY" {
		t.Errorf("last ticker = %q, want SPY", tickers[2].Ticker)
	}
}

// --- RefreshAllMarketPrices ---

func TestRefreshAllMarketPrices_callsListAllHeldTickersNotListHeldTickers(t *testing.T) {
	store := newFakeMarketDataStore()
	store.allHeldTickersSet = true
	store.allHeldTickers = []HeldTicker{
		{Ticker: "AAPL", AssetType: "stock"},
		{Ticker: "MSFT", AssetType: "stock"},
		{Ticker: "SPY", AssetType: "etf"},
	}

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
	store.allHeldTickers = []HeldTicker{{Ticker: "AAPL", AssetType: "stock"}, {Ticker: "SPY", AssetType: "etf"}}

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
	store.allHeldTickers = []HeldTicker{
		{Ticker: "AAPL", AssetType: "stock"},
		{Ticker: "MSFT", AssetType: "stock"},
		{Ticker: "SPY", AssetType: "etf"},
	}

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
	store.allHeldTickers = []HeldTicker{
		{Ticker: "AAPL", AssetType: "stock"},
		{Ticker: "MSFT", AssetType: "stock"},
		{Ticker: "SPY", AssetType: "etf"},
	}
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
	store.allHeldTickers = []HeldTicker{
		{Ticker: "AAPL", AssetType: "stock"},
		{Ticker: "MSFT", AssetType: "stock"},
		{Ticker: "SPY", AssetType: "etf"},
	}
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
	store.allHeldTickers = []HeldTicker{}

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
	store.allHeldTickers = []HeldTicker{{Ticker: "AAPL", AssetType: "stock"}, {Ticker: "SPY", AssetType: "etf"}}
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

// --- FormatSymbol ---

func TestFormatSymbol_cryptoAppendsUSD(t *testing.T) {
	got := FormatSymbol("BTC", "crypto")
	if got != "BTC/USD" {
		t.Errorf("FormatSymbol(BTC, crypto) = %q, want BTC/USD", got)
	}
}

func TestFormatSymbol_cryptoLowercaseAppendsUSD(t *testing.T) {
	got := FormatSymbol("btc", "crypto")
	if got != "BTC/USD" {
		t.Errorf("FormatSymbol(btc, crypto) = %q, want BTC/USD", got)
	}
}

func TestFormatSymbol_cryptoAlreadyHasSlashNoDoubleSuffix(t *testing.T) {
	got := FormatSymbol("BTC/USD", "crypto")
	if got != "BTC/USD" {
		t.Errorf("FormatSymbol(BTC/USD, crypto) = %q, want BTC/USD", got)
	}
}

func TestFormatSymbol_stockUnchangedExceptUppercase(t *testing.T) {
	got := FormatSymbol("aapl", "stock")
	if got != "AAPL" {
		t.Errorf("FormatSymbol(aapl, stock) = %q, want AAPL", got)
	}
}

func TestFormatSymbol_emptyAssetTypeUnchangedExceptUppercase(t *testing.T) {
	got := FormatSymbol("aapl", "")
	if got != "AAPL" {
		t.Errorf("FormatSymbol(aapl, '') = %q, want AAPL", got)
	}
}

// --- FetchQuote crypto ---

func TestFetchQuote_cryptoSymbolFormattedAsBTCUSD(t *testing.T) {
	var capturedSymbol string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedSymbol = r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"symbol":"BTC/USD",
			"currency":"USD",
			"datetime":"2026-05-22",
			"close":"64000.00"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	price, _, _, err := svc.FetchQuote(context.Background(), "BTC", "crypto")
	if err != nil {
		t.Fatalf("FetchQuote() error = %v", err)
	}
	if capturedSymbol != "BTC/USD" {
		t.Errorf("symbol = %q, want BTC/USD", capturedSymbol)
	}
	if price != "64000.00" {
		t.Errorf("price = %q, want 64000.00", price)
	}
}

// --- FetchBatchPrices crypto ---

func TestFetchBatchPrices_cryptoSymbolRequestedAsBTCUSDAndKeyedAsBTC(t *testing.T) {
	var capturedSymbol string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedSymbol = r.URL.Query().Get("symbol")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"BTC/USD":{"price":"64000","currency":"USD"}}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	prices, err := svc.FetchBatchPrices(context.Background(), []HeldTicker{{Ticker: "BTC", AssetType: "crypto"}})
	if err != nil {
		t.Fatalf("FetchBatchPrices() error = %v", err)
	}
	if capturedSymbol != "BTC/USD" {
		t.Errorf("symbol param = %q, want BTC/USD", capturedSymbol)
	}
	if _, ok := prices["BTC"]; !ok {
		t.Errorf("expected result keyed by BTC, got %v", prices)
	}
	if _, ok := prices["BTC/USD"]; ok {
		t.Errorf("expected no BTC/USD key in results, got %v", prices)
	}
	if prices["BTC"].Price != "64000" {
		t.Errorf("price = %q, want 64000", prices["BTC"].Price)
	}
}

// --- SearchSymbols ---

func TestSearchSymbols_parsesDataWrapperAndNormalizesTypes(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"AAPL","instrument_name":"Apple Inc","exchange":"NASDAQ","instrument_type":"Common Stock","country":"United States"},
				{"symbol":"SPY","instrument_name":"SPDR S&P 500 ETF","exchange":"NYSE","instrument_type":"ETF","country":"United States"},
				{"symbol":"BTC/USD","instrument_name":"Bitcoin","exchange":"Coinbase","instrument_type":"Digital Currency","country":""}
			],
			"status": "ok"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "test")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("len = %d, want 3", len(results))
	}
	if results[0].AssetType != "stock" {
		t.Errorf("AAPL asset_type = %q, want stock", results[0].AssetType)
	}
	if results[1].AssetType != "etf" {
		t.Errorf("SPY asset_type = %q, want etf", results[1].AssetType)
	}
	if results[2].AssetType != "crypto" {
		t.Errorf("BTC asset_type = %q, want crypto", results[2].AssetType)
	}
	if results[2].Symbol != "BTC" {
		t.Errorf("BTC symbol = %q, want BTC (USD stripped)", results[2].Symbol)
	}
}

func TestSearchSymbols_non200ReturnsError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`internal server error`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	_, err := svc.SearchSymbols(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected error for non-200 status")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("error = %q, want HTTP 500 mention", err.Error())
	}
}

func TestSearchSymbols_missingAPIKeyReturnsError(t *testing.T) {
	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = ""

	_, err := svc.SearchSymbols(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected missing API key error")
	}
	if !strings.Contains(err.Error(), "TWELVE_DATA_API_KEY") {
		t.Errorf("error = %q, want TWELVE_DATA_API_KEY mention", err.Error())
	}
}

func TestSearchSymbols_emptyOrWhitespaceQueryReturnsError(t *testing.T) {
	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"

	_, err := svc.SearchSymbols(context.Background(), "   ")
	if err == nil {
		t.Fatal("expected error for whitespace-only query")
	}
}

func TestSearchSymbols_cryptoDedupedAcrossExchanges(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"BTC/USD","instrument_name":"Bitcoin","exchange":"Coinbase","instrument_type":"Digital Currency","country":""},
				{"symbol":"BTC/USD","instrument_name":"Bitcoin","exchange":"Binance","instrument_type":"Digital Currency","country":""}
			],
			"status": "ok"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "BTC")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("len = %d, want 1 (deduped across exchanges)", len(results))
	}
	if results[0].Symbol != "BTC" {
		t.Errorf("symbol = %q, want BTC", results[0].Symbol)
	}
	if results[0].AssetType != "crypto" {
		t.Errorf("asset_type = %q, want crypto", results[0].AssetType)
	}
}

func TestSearchSymbols_nonUSStockDropped(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"AAPL","instrument_name":"Apple Inc","exchange":"NASDAQ","instrument_type":"Common Stock","country":"United States"},
				{"symbol":"AAPL","instrument_name":"Apple Inc","exchange":"LSE","instrument_type":"Common Stock","country":"United Kingdom"}
			],
			"status": "ok"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "AAPL")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("len = %d, want 1 (US listing only)", len(results))
	}
	if results[0].Symbol != "AAPL" {
		t.Errorf("symbol = %q, want AAPL", results[0].Symbol)
	}
}

func TestSearchSymbols_australianStockDropped(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"BTC","instrument_name":"BTC Health Ltd","exchange":"ASX","instrument_type":"Common Stock","country":"Australia"}
			],
			"status": "ok"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "BTC")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("len = %d, want 0 (Australian stock dropped)", len(results))
	}
}

func TestSearchSymbols_forexAndIndexOmitted(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"EUR/USD","instrument_name":"Euro vs US Dollar","exchange":"FX","instrument_type":"Physical Currency","country":""},
				{"symbol":"SPX","instrument_name":"S&P 500 Index","exchange":"NYSE","instrument_type":"Index","country":"United States"}
			],
			"status": "ok"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "test")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("len = %d, want 0 (forex and index omitted)", len(results))
	}
}

func TestSearchSymbols_exactMatchSortedFirst(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"BTCX","instrument_name":"BTC Exchange Inc","exchange":"NASDAQ","instrument_type":"Common Stock","country":"United States"},
				{"symbol":"BTC/USD","instrument_name":"Bitcoin","exchange":"Coinbase","instrument_type":"Digital Currency","country":""}
			],
			"status": "ok"
		}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "BTC")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) < 2 {
		t.Fatalf("len = %d, want at least 2", len(results))
	}
	if results[0].Symbol != "BTC" {
		t.Errorf("first result symbol = %q, want BTC (exact match first)", results[0].Symbol)
	}
}

func TestSearchSymbols_cappedAtEight(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[
			{"symbol":"AA","instrument_name":"AA Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"BB","instrument_name":"BB Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"CC","instrument_name":"CC Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"DD","instrument_name":"DD Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"EE","instrument_name":"EE Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"FF","instrument_name":"FF Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"GG","instrument_name":"GG Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"HH","instrument_name":"HH Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"II","instrument_name":"II Inc","exchange":"NYSE","instrument_type":"Common Stock","country":"United States"},
			{"symbol":"BTC/USD","instrument_name":"Bitcoin","exchange":"Coinbase","instrument_type":"Digital Currency","country":""}
		],"status":"ok"}`))
	}))
	defer server.Close()

	svc := NewTwelveDataService(newFakeMarketDataStore())
	svc.apiKey = "test-key"
	svc.httpClient = server.Client()
	svc.baseURL = server.URL

	results, err := svc.SearchSymbols(context.Background(), "test")
	if err != nil {
		t.Fatalf("SearchSymbols() error = %v", err)
	}
	if len(results) != 8 {
		t.Errorf("len = %d, want 8 (capped at 8)", len(results))
	}
}

