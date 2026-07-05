package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"fintu-tracking-backend/internal/services"
)

func TestNewApp_registersHealthRoute(t *testing.T) {
	deps := &Deps{
		BillingSvc: services.NewBillingService(nil, services.NewNoOpBillingProvider()),
	}
	app := NewApp(deps)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/health", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
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
