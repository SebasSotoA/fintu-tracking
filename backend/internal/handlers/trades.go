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

// ListTrades returns all trades for the authenticated user
func ListTrades(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	query := `
		SELECT id, user_id, date, ticker, asset_type, side, quantity, price, fee, total, notes, created_at, updated_at
		FROM trades
		WHERE user_id = $1
		ORDER BY date DESC
	`

	rows, err := database.GetPool().Query(context.Background(), query, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var trades []models.Trade
	for rows.Next() {
		var trade models.Trade
		if err := rows.Scan(&trade.ID, &trade.UserID, &trade.Date, &trade.Ticker, &trade.AssetType, 
			&trade.Side, &trade.Quantity, &trade.Price, &trade.Fee, &trade.Total, &trade.Notes, 
			&trade.CreatedAt, &trade.UpdatedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		trades = append(trades, trade)
	}

	return c.JSON(trades)
}

// CreateTrade creates a new trade
func CreateTrade(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateTradeRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate fields
	if req.AssetType != "stock" && req.AssetType != "etf" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid asset type"})
	}
	if req.Side != "buy" && req.Side != "sell" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid side"})
	}

	quantity, err := decimal.NewFromString(req.Quantity)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid quantity format"})
	}

	price, err := decimal.NewFromString(req.Price)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price format"})
	}

	fee, err := decimal.NewFromString(req.Fee)
	if err != nil {
		fee = decimal.Zero
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format"})
	}

	// Calculate total
	total := quantity.Mul(price).Add(fee)

	id := uuid.New().String()

	query := `
		INSERT INTO trades (id, user_id, date, ticker, asset_type, side, quantity, price, fee, total, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, user_id, date, ticker, asset_type, side, quantity, price, fee, total, notes, created_at, updated_at
	`

	var trade models.Trade
	err = database.GetPool().QueryRow(context.Background(), query,
		id, userID, date, req.Ticker, req.AssetType, req.Side, 
		req.Quantity, req.Price, req.Fee, total.String(), req.Notes).
		Scan(&trade.ID, &trade.UserID, &trade.Date, &trade.Ticker, &trade.AssetType, 
			&trade.Side, &trade.Quantity, &trade.Price, &trade.Fee, &trade.Total, 
			&trade.Notes, &trade.CreatedAt, &trade.UpdatedAt)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(trade)
}

// UpdateTrade updates an existing trade
func UpdateTrade(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	var req models.UpdateTradeRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Get existing trade
	var existingTrade models.Trade
	query := `SELECT date, ticker, asset_type, side, quantity, price, fee FROM trades WHERE id = $1 AND user_id = $2`
	err := database.GetPool().QueryRow(context.Background(), query, id, userID).
		Scan(&existingTrade.Date, &existingTrade.Ticker, &existingTrade.AssetType, 
			&existingTrade.Side, &existingTrade.Quantity, &existingTrade.Price, &existingTrade.Fee)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trade not found"})
	}

	// Apply updates
	if req.Date != nil {
		existingTrade.Date, _ = time.Parse("2006-01-02", *req.Date)
	}
	if req.Ticker != nil {
		existingTrade.Ticker = *req.Ticker
	}
	if req.AssetType != nil {
		existingTrade.AssetType = *req.AssetType
	}
	if req.Side != nil {
		existingTrade.Side = *req.Side
	}
	if req.Quantity != nil {
		existingTrade.Quantity = *req.Quantity
	}
	if req.Price != nil {
		existingTrade.Price = *req.Price
	}
	if req.Fee != nil {
		existingTrade.Fee = *req.Fee
	}

	// Recalculate total
	quantity, _ := decimal.NewFromString(existingTrade.Quantity)
	price, _ := decimal.NewFromString(existingTrade.Price)
	fee, _ := decimal.NewFromString(existingTrade.Fee)
	total := quantity.Mul(price).Add(fee)

	updateQuery := `
		UPDATE trades 
		SET date = $1, ticker = $2, asset_type = $3, side = $4, quantity = $5, 
		    price = $6, fee = $7, total = $8, notes = $9, updated_at = NOW()
		WHERE id = $10 AND user_id = $11
	`

	result, err := database.GetPool().Exec(context.Background(), updateQuery,
		existingTrade.Date, existingTrade.Ticker, existingTrade.AssetType, existingTrade.Side,
		existingTrade.Quantity, existingTrade.Price, existingTrade.Fee, total.String(), 
		req.Notes, id, userID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trade not found"})
	}

	return c.JSON(fiber.Map{"message": "Trade updated successfully"})
}

// DeleteTrade deletes a trade
func DeleteTrade(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	query := `DELETE FROM trades WHERE id = $1 AND user_id = $2`
	result, err := database.GetPool().Exec(context.Background(), query, id, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Trade not found"})
	}

	return c.JSON(fiber.Map{"message": "Trade deleted successfully"})
}

