package handlers

import (
	"fmt"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// exchangeRateSvc is a package-level singleton so the in-memory cache persists
// across requests for the lifetime of the process.
var exchangeRateSvc = services.NewExchangeRateService(nil)

// InitExchangeRateService wires the DB pool into the singleton. Call this after
// database.Connect() in main.go.
func InitExchangeRateService() {
	exchangeRateSvc = services.NewExchangeRateService(database.GetPool())
}

// ListFxRates returns all FX rates for the authenticated user
func ListFxRates(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	query := `
		SELECT id, user_id, date, rate, source, created_at
		FROM fx_rates
		WHERE user_id = $1
		ORDER BY date DESC
	`

	rows, err := database.GetPool().Query(c.Context(), query, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	fxRates := make([]models.FxRate, 0)
	for rows.Next() {
		var rate models.FxRate
		if err := rows.Scan(&rate.ID, &rate.UserID, &rate.Date, &rate.Rate, &rate.Source, &rate.CreatedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		fxRates = append(fxRates, rate)
	}

	return c.JSON(fxRates)
}

// CreateFxRate creates a new FX rate
func CreateFxRate(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateFxRateRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate rate
	if _, err := decimal.NewFromString(req.Rate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid rate format"})
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
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
	err = database.GetPool().QueryRow(c.Context(), query, id, userID, date, req.Rate, source).
		Scan(&fxRate.ID, &fxRate.UserID, &fxRate.Date, &fxRate.Rate, &fxRate.Source, &fxRate.CreatedAt)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fxRate)
}

// UpdateFxRate updates an existing FX rate
func UpdateFxRate(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	var req models.UpdateFxRateRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Build dynamic update query using fmt.Sprintf for placeholder indices
	// to correctly handle two-digit argument positions (avoid rune-arithmetic bug).
	query := `UPDATE fx_rates SET `
	args := []interface{}{}
	argCount := 1

	if req.Date != nil {
		date, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
		}
		query += fmt.Sprintf("date = $%d, ", argCount)
		args = append(args, date)
		argCount++
	}

	if req.Rate != nil {
		if _, err := decimal.NewFromString(*req.Rate); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid rate format"})
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No fields to update"})
	}

	// Remove trailing ", " and append WHERE clause.
	query = query[:len(query)-2] + fmt.Sprintf(" WHERE id = $%d AND user_id = $%d", argCount, argCount+1)
	args = append(args, id, userID)

	result, err := database.GetPool().Exec(c.Context(), query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "FX rate not found"})
	}

	return c.JSON(fiber.Map{"message": "FX rate updated successfully"})
}

// DeleteFxRate deletes an FX rate
func DeleteFxRate(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	query := `DELETE FROM fx_rates WHERE id = $1 AND user_id = $2`
	result, err := database.GetPool().Exec(c.Context(), query, id, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "FX rate not found"})
	}

	return c.JSON(fiber.Map{"message": "FX rate deleted successfully"})
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
func GetCurrentRate(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	from := strings.ToUpper(strings.TrimSpace(c.Query("from", "USD")))
	to := strings.ToUpper(strings.TrimSpace(c.Query("to", "COP")))

	// Validate supported pairs.
	if !((from == "USD" && to == "COP") || (from == "COP" && to == "USD")) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "unsupported currency pair: only USD/COP and COP/USD are supported",
		})
	}

	// Always fetch the base USD→COP rate (cached; no extra API call for the inverse).
	base, err := exchangeRateSvc.FetchCurrentRate(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "could not retrieve current exchange rate: " + err.Error(),
		})
	}

	rate := base.Rate

	// Compute inverse when COP→USD is requested.
	if from == "COP" && to == "USD" {
		baseDecimal, parseErr := decimal.NewFromString(base.Rate)
		if parseErr != nil || baseDecimal.IsZero() {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "invalid base rate, cannot compute inverse",
			})
		}
		rate = decimal.NewFromInt(1).Div(baseDecimal).StringFixed(6)
	}

	// Use the date from the service result to avoid midnight skew between the
	// cache-key computation in the service and the timestamp in this handler.
	return c.JSON(fiber.Map{
		"rate":   rate,
		"date":   base.Date,
		"source": base.Source,
		"from":   from,
		"to":     to,
	})
}
