package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
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

func TestMain(m *testing.M) {
	os.Unsetenv("TWELVE_DATA_API_KEY")
	os.Exit(m.Run())
}
