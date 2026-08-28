package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"fintu-tracking-backend/internal/services"

	"github.com/go-chi/chi/v5"
)

func setupSearchService(t *testing.T, mockHandler http.HandlerFunc) {
	t.Helper()
	server := httptest.NewServer(mockHandler)
	t.Cleanup(server.Close)

	store := &cronFakeStore{
		marketPrices: map[string]struct{ price, currency, updatedAt string }{},
	}
	svc := services.NewTwelveDataService(store)
	svc.ConfigureForTesting(server.Client(), server.URL, "test-key")
	InitTwelveDataService(svc)
}

func searchApp(userID string) chi.Router {
	r := chi.NewRouter()
	r.Use(withUser(userID))
	r.Get("/market-prices/search", SearchMarketPrices)
	r.Get("/market-prices/{ticker}", GetMarketPrice)
	return r
}

func TestSearchMarketPrices_missingQReturns400(t *testing.T) {
	t.Parallel()

	app := chi.NewRouter()
	app.Use(withUser("user-1"))
	app.Get("/market-prices/search", SearchMarketPrices)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/market-prices/search", nil))

	assertStatus(t, rec.Result(), http.StatusBadRequest)
}

func TestSearchMarketPrices_unauthorizedWithoutUser(t *testing.T) {
	t.Parallel()

	app := chi.NewRouter()
	app.Get("/market-prices/search", SearchMarketPrices)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/market-prices/search?q=AAPL", nil))

	assertStatus(t, rec.Result(), http.StatusUnauthorized)
}

func TestSearchMarketPrices_whitespaceQReturns400(t *testing.T) {
	t.Parallel()

	app := chi.NewRouter()
	app.Use(withUser("user-1"))
	app.Get("/market-prices/search", SearchMarketPrices)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/market-prices/search?q=+++", nil))

	assertStatus(t, rec.Result(), http.StatusBadRequest)
}

func TestSearchMarketPrices_successReturnsResults(t *testing.T) {
	setupSearchService(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"data": [
				{"symbol":"AAPL","instrument_name":"Apple Inc","exchange":"NASDAQ","instrument_type":"Common Stock","country":"United States"}
			],
			"status": "ok"
		}`))
	}))

	app := chi.NewRouter()
	app.Use(withUser("user-1"))
	app.Get("/market-prices/search", SearchMarketPrices)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/market-prices/search?q=AAPL", nil))

	resp := rec.Result()
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusOK)

	var results []services.SearchResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("len = %d, want 1", len(results))
	}
	if results[0].Symbol != "AAPL" {
		t.Errorf("symbol = %q, want AAPL", results[0].Symbol)
	}
	if results[0].AssetType != "stock" {
		t.Errorf("asset_type = %q, want stock", results[0].AssetType)
	}
}

func TestSearchMarketPrices_searchRouteNotCapturedByTickerRoute(t *testing.T) {
	t.Parallel()

	app := searchApp("user-1")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/market-prices/search?q=AAPL", nil))

	if rec.Code == http.StatusNotFound {
		t.Errorf("search route returned 404; likely captured by {ticker} wildcard")
	}
}

func TestSearchMarketPrices_missingAPIKeyReturns503(t *testing.T) {
	store := &cronFakeStore{
		marketPrices: map[string]struct{ price, currency, updatedAt string }{},
	}
	svc := services.NewTwelveDataService(store)
	svc.ConfigureForTesting(http.DefaultClient, "http://localhost:0", "")
	InitTwelveDataService(svc)

	app := chi.NewRouter()
	app.Use(withUser("user-1"))
	app.Get("/market-prices/search", SearchMarketPrices)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/market-prices/search?q=AAPL", nil))

	assertStatus(t, rec.Result(), http.StatusServiceUnavailable)
}
