package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"
)

func setupCronService(t *testing.T) {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"AAPL":{"price":"181.00","currency":"USD"},"MSFT":{"price":"330.00","currency":"USD"},"SPY":{"price":"500.00","currency":"USD"}}`))
	}))
	t.Cleanup(server.Close)

	store := &cronFakeStore{
		marketPrices: map[string]struct{ price, currency, updatedAt string }{},
	}
	svc := services.NewTwelveDataService(store)
	svc.ConfigureForTesting(server.Client(), server.URL, "test-key")
	InitTwelveDataService(svc)
}

func TestRefreshAllMarketPricesCron_rejectsMissingSecret(t *testing.T) {
	t.Setenv("CRON_SECRET", "super-secret")
	setupCronService(t)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/cron/refresh-prices", nil)
	RefreshAllMarketPricesCron(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusUnauthorized)
	}
}

func TestRefreshAllMarketPricesCron_rejectsWrongSecret(t *testing.T) {
	t.Setenv("CRON_SECRET", "super-secret")
	setupCronService(t)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/cron/refresh-prices", nil)
	req.Header.Set("X-Cron-Secret", "wrong-secret")
	RefreshAllMarketPricesCron(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusUnauthorized)
	}
}

func TestRefreshAllMarketPricesCron_acceptsCorrectSecret(t *testing.T) {
	t.Setenv("CRON_SECRET", "super-secret")
	setupCronService(t)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/cron/refresh-prices", nil)
	req.Header.Set("X-Cron-Secret", "super-secret")
	RefreshAllMarketPricesCron(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["updated"] == nil {
		t.Errorf("expected updated field in response, got %v", body)
	}
}

func TestRefreshAllMarketPricesCron_rejectsNonPostMethods(t *testing.T) {
	t.Setenv("CRON_SECRET", "super-secret")
	setupCronService(t)

	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodPatch, http.MethodDelete} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(method, "/api/cron/refresh-prices", nil)
		req.Header.Set("X-Cron-Secret", "super-secret")
		RefreshAllMarketPricesCron(rec, req)

		resp := rec.Result()
		resp.Body.Close()
		if resp.StatusCode != http.StatusMethodNotAllowed {
			t.Errorf("method %s: status = %d, want %d", method, resp.StatusCode, http.StatusMethodNotAllowed)
		}
	}
}

func TestRefreshAllMarketPricesCron_rejectsWhenSecretEnvUnset(t *testing.T) {
	t.Setenv("CRON_SECRET", "")
	setupCronService(t)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/cron/refresh-prices", nil)
	req.Header.Set("X-Cron-Secret", "anything")
	RefreshAllMarketPricesCron(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d (empty CRON_SECRET should reject)", resp.StatusCode, http.StatusUnauthorized)
	}
}

type cronFakeStore struct {
	marketPrices map[string]struct {
		price     string
		currency  string
		updatedAt string
	}
}

func (s *cronFakeStore) GetFxRate(_ context.Context, userID, date, source string) (models.RateResult, bool, error) {
	return models.RateResult{}, false, nil
}

func (s *cronFakeStore) UpsertFxRate(_ context.Context, userID string, date time.Time, rate, source string) error {
	return nil
}

func (s *cronFakeStore) GetLatestFxRate(_ context.Context, userID string) (models.RateResult, bool, error) {
	return models.RateResult{}, false, nil
}

func (s *cronFakeStore) ListHeldTickers(_ context.Context, userID string) ([]models.HeldTicker, error) {
	return nil, nil
}

func (s *cronFakeStore) ListAllHeldTickers(_ context.Context) ([]models.HeldTicker, error) {
	return []models.HeldTicker{
		{Ticker: "AAPL", AssetType: "stock"},
		{Ticker: "MSFT", AssetType: "stock"},
		{Ticker: "SPY", AssetType: "etf"},
	}, nil
}

func (s *cronFakeStore) GetMarketPrice(_ context.Context, ticker string) (models.MarketPrice, bool, error) {
	return models.MarketPrice{}, false, nil
}

func (s *cronFakeStore) GetMarketPrices(_ context.Context, tickers []string) ([]models.MarketPrice, error) {
	return nil, nil
}

func (s *cronFakeStore) UpsertMarketPrice(_ context.Context, ticker, price, currency string) error {
	s.marketPrices[ticker] = struct {
		price     string
		currency  string
		updatedAt string
	}{price: price, currency: currency, updatedAt: time.Now().Format(time.RFC3339)}
	return nil
}

func (s *cronFakeStore) RecordMarketPriceRefresh(_ context.Context, userID string) error {
	return nil
}

func (s *cronFakeStore) GetLastMarketPriceRefresh(_ context.Context, userID string) (time.Time, bool, error) {
	return time.Time{}, false, nil
}