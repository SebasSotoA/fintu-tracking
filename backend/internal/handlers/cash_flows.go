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

const cashFlowListColumns = `
	id, user_id, date, type, currency, amount, fx_rate, usd_amount, notes,
	fee_type, related_trade_id, related_cash_flow_id, related_type, created_at, updated_at
`

// ListCashFlows returns cash flows for the authenticated user.
// Without page/page_size query params, returns a plain JSON array (legacy).
// With page or page_size, returns models.PaginatedResponse.
func ListCashFlows(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	filters, err := parseCashFlowListFilters(
		c.Query("from"),
		c.Query("to"),
		c.Query("type"),
		c.Query("currency"),
	)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	pageStr := c.Query("page")
	pageSizeStr := c.Query("page_size")

	limit := 0
	offset := 0
	page := 1
	pageSize := defaultPageSize

	if paginationRequested(pageStr, pageSizeStr) {
		params, err := parsePaginationParams(pageStr, pageSizeStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		page = params.page
		pageSize = params.pageSize
		limit = pageSize
		offset = (page - 1) * pageSize
	}

	var total int
	if limit > 0 {
		countQuery, countArgs := buildCountCashFlowsQuery(userID, filters)
		if err := database.GetPool().QueryRow(context.Background(), countQuery, countArgs...).Scan(&total); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		page = clampPage(page, total, pageSize)
		offset = (page - 1) * pageSize
	}

	query, args := buildListCashFlowsQuery(userID, filters, limit, offset)

	rows, err := database.GetPool().Query(context.Background(), query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	cashFlows := make([]models.CashFlow, 0)
	for rows.Next() {
		var cf models.CashFlow
		if err := scanCashFlowRow(rows, &cf); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		cashFlows = append(cashFlows, cf)
	}

	if limit > 0 {
		return c.JSON(models.PaginatedResponse[models.CashFlow]{
			Items:    cashFlows,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		})
	}

	return c.JSON(cashFlows)
}

type cashFlowScanner interface {
	Scan(dest ...any) error
}

func scanCashFlowRow(row cashFlowScanner, cf *models.CashFlow) error {
	return row.Scan(
		&cf.ID, &cf.UserID, &cf.Date, &cf.Type, &cf.Currency, &cf.Amount, &cf.FxRate, &cf.UsdAmount,
		&cf.Notes, &cf.FeeType, &cf.RelatedTradeID, &cf.RelatedCashFlowID, &cf.RelatedType,
		&cf.CreatedAt, &cf.UpdatedAt,
	)
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

	var usdAmount decimal.Decimal
	var fxRate *decimal.Decimal

	if req.Currency == "USD" {
		usdAmount = amount
	} else {
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
		INSERT INTO cash_flows (id, user_id, date, type, currency, amount, fx_rate, usd_amount, notes, fee_type, related_trade_id, related_cash_flow_id, related_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING ` + cashFlowListColumns + `
	`

	var cashFlow models.CashFlow
	var fxRateStr *string
	if fxRate != nil {
		s := fxRate.String()
		fxRateStr = &s
	}

	err = database.GetPool().QueryRow(context.Background(), query,
		id, userID, date, req.Type, req.Currency, req.Amount, fxRateStr, usdAmount.String(), req.Notes,
		req.FeeType, req.RelatedTradeID, req.RelatedCashFlowID, req.RelatedType).
		Scan(
			&cashFlow.ID, &cashFlow.UserID, &cashFlow.Date, &cashFlow.Type, &cashFlow.Currency,
			&cashFlow.Amount, &cashFlow.FxRate, &cashFlow.UsdAmount, &cashFlow.Notes,
			&cashFlow.FeeType, &cashFlow.RelatedTradeID, &cashFlow.RelatedCashFlowID, &cashFlow.RelatedType,
			&cashFlow.CreatedAt, &cashFlow.UpdatedAt,
		)

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

	var existingCF models.CashFlow
	query := `SELECT date, type, currency, amount, fx_rate, fee_type, related_trade_id, related_cash_flow_id, related_type FROM cash_flows WHERE id = $1 AND user_id = $2`
	err := database.GetPool().QueryRow(context.Background(), query, id, userID).
		Scan(&existingCF.Date, &existingCF.Type, &existingCF.Currency, &existingCF.Amount, &existingCF.FxRate,
			&existingCF.FeeType, &existingCF.RelatedTradeID, &existingCF.RelatedCashFlowID, &existingCF.RelatedType)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cash flow not found"})
	}

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
	if req.FeeType != nil {
		existingCF.FeeType = req.FeeType
	}
	if req.RelatedTradeID != nil {
		existingCF.RelatedTradeID = req.RelatedTradeID
	}
	if req.RelatedCashFlowID != nil {
		existingCF.RelatedCashFlowID = req.RelatedCashFlowID
	}
	if req.RelatedType != nil {
		existingCF.RelatedType = req.RelatedType
	}

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
			fee_type = $8, related_trade_id = $9, related_cash_flow_id = $10, related_type = $11, updated_at = NOW()
		WHERE id = $12 AND user_id = $13
	`

	result, err := database.GetPool().Exec(context.Background(), updateQuery,
		existingCF.Date, existingCF.Type, existingCF.Currency, existingCF.Amount,
		existingCF.FxRate, usdAmount.String(), req.Notes,
		existingCF.FeeType, existingCF.RelatedTradeID, existingCF.RelatedCashFlowID, existingCF.RelatedType,
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
