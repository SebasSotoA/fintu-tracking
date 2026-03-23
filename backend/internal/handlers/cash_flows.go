package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ListCashFlows returns all cash flows for the authenticated user
func ListCashFlows(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	query := `
		SELECT id, user_id, date, type, currency, amount, fx_rate, usd_amount, notes, broker_id, fee_type, related_trade_id, related_type, created_at, updated_at
		FROM cash_flows
		WHERE user_id = $1
		ORDER BY date DESC
	`

	rows, err := database.GetPool().Query(context.Background(), query, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	cashFlows := make([]models.CashFlow, 0)
	for rows.Next() {
		var cf models.CashFlow
		if err := rows.Scan(&cf.ID, &cf.UserID, &cf.Date, &cf.Type, &cf.Currency, &cf.Amount, &cf.FxRate, &cf.UsdAmount, &cf.Notes, &cf.BrokerID, &cf.FeeType, &cf.RelatedTradeID, &cf.RelatedType, &cf.CreatedAt, &cf.UpdatedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		cashFlows = append(cashFlows, cf)
	}

	return c.JSON(cashFlows)
}

// CreateCashFlow creates a new cash flow
func CreateCashFlow(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateCashFlowRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate fields
	if req.Type != "deposit" && req.Type != "withdrawal" && req.Type != "fee" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid type"})
	}
	if req.Currency != "COP" && req.Currency != "USD" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid currency"})
	}

	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid amount format"})
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
	}

	// Calculate USD amount
	var usdAmount decimal.Decimal
	var fxRate *decimal.Decimal

	if req.Currency == "USD" {
		usdAmount = amount
	} else {
		// COP to USD conversion
		if req.FxRate == nil || *req.FxRate == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "FX rate required for COP transactions"})
		}
		rate, err := decimal.NewFromString(*req.FxRate)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid FX rate format"})
		}
		fxRate = &rate
		usdAmount = amount.Div(rate)
	}

	id := uuid.New().String()

	query := `
		INSERT INTO cash_flows (id, user_id, date, type, currency, amount, fx_rate, usd_amount, notes, broker_id, fee_type, related_trade_id, related_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, user_id, date, type, currency, amount, fx_rate, usd_amount, notes, broker_id, fee_type, related_trade_id, related_type, created_at, updated_at
	`

	var cashFlow models.CashFlow
	var fxRateStr *string
	if fxRate != nil {
		s := fxRate.String()
		fxRateStr = &s
	}

	err = database.GetPool().QueryRow(context.Background(), query,
		id, userID, date, req.Type, req.Currency, req.Amount, fxRateStr, usdAmount.String(), req.Notes,
		req.BrokerID, req.FeeType, req.RelatedTradeID, req.RelatedType).
		Scan(&cashFlow.ID, &cashFlow.UserID, &cashFlow.Date, &cashFlow.Type, &cashFlow.Currency,
			&cashFlow.Amount, &cashFlow.FxRate, &cashFlow.UsdAmount, &cashFlow.Notes,
			&cashFlow.BrokerID, &cashFlow.FeeType, &cashFlow.RelatedTradeID, &cashFlow.RelatedType,
			&cashFlow.CreatedAt, &cashFlow.UpdatedAt)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(cashFlow)
}

// UpdateCashFlow updates an existing cash flow
func UpdateCashFlow(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	var req models.UpdateCashFlowRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Get existing cash flow to have base values
	var existingCF models.CashFlow
	query := `SELECT date, type, currency, amount, fx_rate, broker_id, fee_type, related_trade_id, related_type FROM cash_flows WHERE id = $1 AND user_id = $2`
	err := database.GetPool().QueryRow(context.Background(), query, id, userID).
		Scan(&existingCF.Date, &existingCF.Type, &existingCF.Currency, &existingCF.Amount, &existingCF.FxRate,
			&existingCF.BrokerID, &existingCF.FeeType, &existingCF.RelatedTradeID, &existingCF.RelatedType)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cash flow not found"})
	}

	// Apply updates
	if req.Date != nil {
		existingCF.Date, _ = time.Parse("2006-01-02", *req.Date)
	}
	if req.Type != nil {
		existingCF.Type = *req.Type
	}
	if req.Currency != nil {
		existingCF.Currency = *req.Currency
	}
	if req.Amount != nil {
		existingCF.Amount = *req.Amount
	}
	if req.FxRate != nil {
		existingCF.FxRate = req.FxRate
	}
	if req.BrokerID != nil {
		existingCF.BrokerID = req.BrokerID
	}
	if req.FeeType != nil {
		existingCF.FeeType = req.FeeType
	}
	if req.RelatedTradeID != nil {
		existingCF.RelatedTradeID = req.RelatedTradeID
	}
	if req.RelatedType != nil {
		existingCF.RelatedType = req.RelatedType
	}

	// Recalculate USD amount
	amount, _ := decimal.NewFromString(existingCF.Amount)
	var usdAmount decimal.Decimal
	if existingCF.Currency == "USD" {
		usdAmount = amount
	} else {
		if existingCF.FxRate == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "FX rate required for COP"})
		}
		rate, _ := decimal.NewFromString(*existingCF.FxRate)
		usdAmount = amount.Div(rate)
	}

	updateQuery := `
		UPDATE cash_flows 
		SET date = $1, type = $2, currency = $3, amount = $4, fx_rate = $5, usd_amount = $6, notes = $7,
			broker_id = $8, fee_type = $9, related_trade_id = $10, related_type = $11, updated_at = NOW()
		WHERE id = $12 AND user_id = $13
	`

	result, err := database.GetPool().Exec(context.Background(), updateQuery,
		existingCF.Date, existingCF.Type, existingCF.Currency, existingCF.Amount,
		existingCF.FxRate, usdAmount.String(), req.Notes,
		existingCF.BrokerID, existingCF.FeeType, existingCF.RelatedTradeID, existingCF.RelatedType,
		id, userID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cash flow not found"})
	}

	return c.JSON(fiber.Map{"message": "Cash flow updated successfully"})
}

// DeleteCashFlow deletes a cash flow
func DeleteCashFlow(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	query := `DELETE FROM cash_flows WHERE id = $1 AND user_id = $2`
	result, err := database.GetPool().Exec(context.Background(), query, id, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Error: %v", err)})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cash flow not found"})
	}

	return c.JSON(fiber.Map{"message": "Cash flow deleted successfully"})
}

