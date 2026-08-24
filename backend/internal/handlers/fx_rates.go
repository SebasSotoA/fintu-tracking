package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// exchangeRateSvc is a package-level singleton so the in-memory cache persists
// across requests for the lifetime of the process.
var exchangeRateSvc *services.ExchangeRateService

// InitExchangeRateService sets the package-level exchange rate service used by
// handlers. It is called once from Bootstrap after the DB pool is available.
func InitExchangeRateService(svc *services.ExchangeRateService) {
	exchangeRateSvc = svc
}

// ListFxRates returns all FX rates for the authenticated user
func ListFxRates(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	query := `
		SELECT id, user_id, date, rate, source, created_at
		FROM fx_rates
		WHERE user_id = $1
		ORDER BY date DESC
	`

	rows, err := database.GetPool().Query(r.Context(), query, userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	fxRates := make([]models.FxRate, 0)
	for rows.Next() {
		var rate models.FxRate
		if err := rows.Scan(&rate.ID, &rate.UserID, &rate.Date, &rate.Rate, &rate.Source, &rate.CreatedAt); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		fxRates = append(fxRates, rate)
	}

	httpx.JSON(w, http.StatusOK, fxRates)
}

// CreateFxRate creates a new FX rate
func CreateFxRate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateFxRateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate rate
	if _, err := decimal.NewFromString(req.Rate); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid rate format")
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid date format")
		return
	}

	id := uuid.New().String()
	source := req.Source
	if source == "" {
		source = "manual"
	}

	query := `
		INSERT INTO fx_rates (id, user_id, date, rate, source)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, date) 
		DO UPDATE SET rate = $4, source = $5
		RETURNING id, user_id, date, rate, source, created_at
	`

	var fxRate models.FxRate
	err = database.GetPool().QueryRow(r.Context(), query, id, userID, date, req.Rate, source).
		Scan(&fxRate.ID, &fxRate.UserID, &fxRate.Date, &fxRate.Rate, &fxRate.Source, &fxRate.CreatedAt)

	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, fxRate)
}

// UpdateFxRate updates an existing FX rate
func UpdateFxRate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	var req models.UpdateFxRateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Build dynamic update query using fmt.Sprintf for placeholder indices
	// to correctly handle two-digit argument positions (avoid rune-arithmetic bug).
	query := `UPDATE fx_rates SET `
	args := []interface{}{}
	argCount := 1

	if req.Date != nil {
		date, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Invalid date format")
			return
		}
		query += fmt.Sprintf("date = $%d, ", argCount)
		args = append(args, date)
		argCount++
	}

	if req.Rate != nil {
		if _, err := decimal.NewFromString(*req.Rate); err != nil {
			httpx.Error(w, http.StatusBadRequest, "Invalid rate format")
			return
		}
		query += fmt.Sprintf("rate = $%d, ", argCount)
		args = append(args, *req.Rate)
		argCount++
	}

	if req.Source != nil {
		query += fmt.Sprintf("source = $%d, ", argCount)
		args = append(args, *req.Source)
		argCount++
	}

	if len(args) == 0 {
		httpx.Error(w, http.StatusBadRequest, "No fields to update")
		return
	}

	// Remove trailing ", " and append WHERE clause.
	query = query[:len(query)-2] + fmt.Sprintf(" WHERE id = $%d AND user_id = $%d", argCount, argCount+1)
	args = append(args, id, userID)

	result, err := database.GetPool().Exec(r.Context(), query, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "FX rate not found")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"message": "FX rate updated successfully"})
}

// DeleteFxRate deletes an FX rate
func DeleteFxRate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")

	query := `DELETE FROM fx_rates WHERE id = $1 AND user_id = $2`
	result, err := database.GetPool().Exec(r.Context(), query, id, userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "FX rate not found")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"message": "FX rate deleted successfully"})
}

// GetFxRateChart returns daily USD/COP closes from Twelve Data for charting.
func GetFxRateChart(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	days := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			days = parsed
		}
	}

	points, err := exchangeRateSvc.FetchDailyHistory(r.Context(), days)
	if err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]any{
			"error": err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, points)
}

// GetCurrentRate returns the current exchange rate between two currencies.
//
// Query params (both optional, case-insensitive):
//
//	?from=USD&to=COP  (default) — returns COP per 1 USD, e.g. 4185.00
//	?from=COP&to=USD          — returns USD per 1 COP, e.g. 0.000239
//
// Only USD/COP and COP/USD are supported. The base USD→COP rate is always
// fetched/cached once; the inverse is derived mathematically with no extra API call.
func GetCurrentRate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	from := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("from")))
	if from == "" {
		from = config.BaseCurrency
	}
	to := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("to")))
	if to == "" {
		to = config.LocalCurrency
	}

	// Validate supported pairs.
	pair := from + "/" + to
	if !slices.Contains(config.SupportedCurrencyPairs, pair) {
		httpx.Error(w, http.StatusBadRequest, fmt.Sprintf("unsupported currency pair: only %s are supported", strings.Join(config.SupportedCurrencyPairs, ", ")))
		return
	}

	// Always fetch the base USD→COP rate (cached; no extra API call for the inverse).
	base, err := exchangeRateSvc.FetchCurrentRate(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "could not retrieve current exchange rate: "+err.Error())
		return
	}

	rate := base.Rate

	// Compute inverse when local→base is requested.
	if pair == config.InverseCurrencyPair {
		baseDecimal, parseErr := decimal.NewFromString(base.Rate)
		if parseErr != nil || baseDecimal.IsZero() {
			httpx.Error(w, http.StatusInternalServerError, "invalid base rate, cannot compute inverse")
			return
		}
		rate = decimal.NewFromInt(1).Div(baseDecimal).StringFixed(6)
	}

	// Use the date from the service result to avoid midnight skew between the
	// cache-key computation in the service and the timestamp in this handler.
	httpx.JSON(w, http.StatusOK, map[string]any{
		"rate":   rate,
		"date":   base.Date,
		"source": base.Source,
		"from":   from,
		"to":     to,
	})
}