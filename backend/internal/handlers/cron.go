package handlers

import (
	"net/http"
	"os"
	"strings"

	"fintu-tracking-backend/internal/httpx"
)

// RefreshAllMarketPricesCron is the scheduled EOD price refresh endpoint.
// It is authenticated via the X-Cron-Secret header (matching CRON_SECRET env)
// rather than a JWT, so it can be invoked by a cron job or Lambda scheduler.
func RefreshAllMarketPricesCron(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]any{
			"error": "method not allowed",
		})
		return
	}

	expected := strings.TrimSpace(os.Getenv("CRON_SECRET"))
	provided := r.Header.Get("X-Cron-Secret")
	if expected == "" || provided == "" || provided != expected {
		httpx.JSON(w, http.StatusUnauthorized, map[string]any{
			"error": "Unauthorized",
		})
		return
	}

	result, err := twelveDataSvc.RefreshAllMarketPrices(r.Context())
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error":   err.Error(),
			"updated": result.Updated,
			"skipped": result.Skipped,
			"tickers": result.Tickers,
			"errors":  result.Errors,
		})
		return
	}

	httpx.JSON(w, http.StatusOK, result)
}