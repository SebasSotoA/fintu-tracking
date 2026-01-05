package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

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

	rows, err := database.GetPool().Query(context.Background(), query, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var fxRates []models.FxRate
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
	err = database.GetPool().QueryRow(context.Background(), query, id, userID, date, req.Rate, source).
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

	// Build dynamic update query
	query := `UPDATE fx_rates SET `
	args := []interface{}{}
	argCount := 1

	if req.Date != nil {
		date, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
		}
		query += `date = $` + string(rune(argCount+'0')) + `, `
		args = append(args, date)
		argCount++
	}

	if req.Rate != nil {
		if _, err := decimal.NewFromString(*req.Rate); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid rate format"})
		}
		query += `rate = $` + string(rune(argCount+'0')) + `, `
		args = append(args, *req.Rate)
		argCount++
	}

	if req.Source != nil {
		query += `source = $` + string(rune(argCount+'0')) + `, `
		args = append(args, *req.Source)
		argCount++
	}

	if len(args) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No fields to update"})
	}

	// Remove trailing comma and add WHERE clause
	query = query[:len(query)-2] + ` WHERE id = $` + string(rune(argCount+'0')) + ` AND user_id = $` + string(rune(argCount+1+'0'))
	args = append(args, id, userID)

	result, err := database.GetPool().Exec(context.Background(), query, args...)
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
	result, err := database.GetPool().Exec(context.Background(), query, id, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "FX rate not found"})
	}

	return c.JSON(fiber.Map{"message": "FX rate deleted successfully"})
}

