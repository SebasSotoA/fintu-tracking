package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestAnalyticsHandlers_ReturnUnauthorizedWhenUserIDMissing(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		handler fiber.Handler
		route   string
		request string
	}{
		{"GetFeeBreakdown", GetFeeBreakdown, "/fee-breakdown", "/fee-breakdown"},
		{"GetFeeImpact", GetFeeImpact, "/fee-impact", "/fee-impact?ticker=AAPL"},
		{"GetFeeEfficiency", GetFeeEfficiency, "/fee-efficiency", "/fee-efficiency"},
		{"GetReturnAttribution", GetReturnAttribution, "/return-attribution", "/return-attribution"},
		{"GetFXImpact", GetFXImpact, "/fx-impact", "/fx-impact"},
		{"GetPerformanceTimeSeries", GetPerformanceTimeSeries, "/performance-time-series", "/performance-time-series"},
		{"GetNetWorth", GetNetWorth, "/net-worth", "/net-worth"},
		{"GetCashBreakdown", GetCashBreakdown, "/cash-breakdown", "/cash-breakdown"},
		{"GetCashReconciliation", GetCashReconciliation, "/cash-reconciliation", "/cash-reconciliation"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			app := fiber.New()
			app.Get(tc.route, tc.handler)

			req := httptest.NewRequest(http.MethodGet, tc.request, nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", resp.StatusCode, http.StatusUnauthorized)
			}

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("read body: %v", err)
			}

			var payload map[string]string
			if err := json.Unmarshal(body, &payload); err != nil {
				t.Fatalf("unmarshal body: %v", err)
			}
			if payload["error"] != "Unauthorized" {
				t.Fatalf("error = %q, want %q", payload["error"], "Unauthorized")
			}
		})
	}
}
