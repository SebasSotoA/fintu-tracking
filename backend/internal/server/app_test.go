package server

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fintu-tracking-backend/internal/services"
)

func TestNewApp_registersHealthRoute(t *testing.T) {
	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	app := NewApp(deps)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	resp := rec.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	var payload map[string]string
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if payload["status"] != "ok" {
		t.Errorf("status field = %q, want ok", payload["status"])
	}
	if payload["service"] != "fintu-tracking-api" {
		t.Errorf("service field = %q, want fintu-tracking-api", payload["service"])
	}
}

func TestNewApp_registersMeRoute(t *testing.T) {
	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	app := NewApp(deps)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/me", nil))
	resp := rec.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d (route must exist and require auth)", resp.StatusCode, http.StatusUnauthorized)
	}
}

func TestNewApp_healthNotUnderAPIPrefix(t *testing.T) {
	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	app := NewApp(deps)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	resp := rec.Result()
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		t.Fatalf("status = %d, want non-200 (health must not be served under /api)", resp.StatusCode)
	}
}

func TestCORSAllowOrigins_includesLocalhostDefaults(t *testing.T) {
	t.Setenv("FRONTEND_URL", "")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	origins := corsAllowOrigins()
	if len(origins) != 3 {
		t.Fatalf("len(origins) = %d, want 3", len(origins))
	}
	if origins[0] != "http://localhost:3000" || origins[1] != "http://localhost:3001" || origins[2] != "http://localhost:3002" {
		t.Errorf("origins = %v, want localhost defaults", origins)
	}
}

func TestCORSAllowOrigins_includesFrontendURLWhenSet(t *testing.T) {
	t.Setenv("FRONTEND_URL", "https://app.example.com")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	origins := corsAllowOrigins()
	if len(origins) != 4 {
		t.Fatalf("len(origins) = %d, want 4", len(origins))
	}
	if origins[3] != "https://app.example.com" {
		t.Errorf("last origin = %q, want https://app.example.com", origins[3])
	}
}

func TestNewApp_corsAllowsFrontendURLOrigin(t *testing.T) {
	t.Setenv("FRONTEND_URL", "https://app.example.com")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	app := NewApp(deps)

	req := httptest.NewRequest(http.MethodOptions, "/health", nil)
	req.Header.Set("Origin", "https://app.example.com")
	req.Header.Set("Access-Control-Request-Method", "GET")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)
	resp := rec.Result()
	defer resp.Body.Close()

	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Errorf("Access-Control-Allow-Origin = %q, want https://app.example.com", got)
	}
}

func TestNewApp_warnsWhenLambdaMissingFrontendURL(t *testing.T) {
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "127.0.0.1:9001")
	t.Setenv("FRONTEND_URL", "")

	var logBuf bytes.Buffer
	originalOutput := log.Writer()
	log.SetOutput(&logBuf)
	t.Cleanup(func() {
		log.SetOutput(originalOutput)
	})

	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	NewApp(deps)

	if !strings.Contains(logBuf.String(), "FRONTEND_URL") {
		t.Errorf("expected Lambda warning mentioning FRONTEND_URL, got: %q", logBuf.String())
	}
}

func TestNewApp_noLambdaWarningWhenFrontendURLSet(t *testing.T) {
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "127.0.0.1:9001")
	t.Setenv("FRONTEND_URL", "https://app.example.com")

	var logBuf bytes.Buffer
	originalOutput := log.Writer()
	log.SetOutput(&logBuf)
	t.Cleanup(func() {
		log.SetOutput(originalOutput)
	})

	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	NewApp(deps)

	if strings.Contains(logBuf.String(), "FRONTEND_URL") {
		t.Errorf("unexpected Lambda warning when FRONTEND_URL is set: %q", logBuf.String())
	}
}