package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/utils"

	"github.com/gofiber/fiber/v3"
)

// GetHoldings calculates and returns current holdings
func GetHoldings(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Fetch all trades
	query := `
		SELECT id, user_id, date, ticker, asset_type, side, quantity, price, fee, total, notes, created_at, updated_at
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC
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

	// Calculate holdings
	holdings := utils.CalculateHoldings(trades)

	// Fetch market prices
	priceQuery := `SELECT ticker, price FROM market_prices`
	priceRows, err := database.GetPool().Query(context.Background(), priceQuery)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer priceRows.Close()

	prices := make(map[string]string)
	for priceRows.Next() {
		var ticker, price string
		if err := priceRows.Scan(&ticker, &price); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		prices[ticker] = price
	}

	// Update holdings with prices
	updatedHoldings := utils.UpdateHoldingsWithPrices(holdings, prices)

	// Convert map to array for JSON response
	holdingsArray := make([]models.Holding, 0, len(updatedHoldings))
	for _, holding := range updatedHoldings {
		holdingsArray = append(holdingsArray, holding)
	}

	return c.JSON(holdingsArray)
}

// GetPerformance calculates and returns performance metrics
func GetPerformance(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// This is a placeholder for performance metrics
	// You would need to implement XIRR calculation with cash flows
	// For now, return basic structure
	metrics := models.PerformanceMetrics{
		TotalInvested:   "0",
		TotalValue:      "0",
		TotalReturn:     "0",
		TotalReturnPct:  "0",
		XIRR:            "0",
	}

	return c.JSON(metrics)
}

// ListMarketPrices returns all market prices
func ListMarketPrices(c fiber.Ctx) error {
	query := `SELECT ticker, price, currency, updated_at FROM market_prices ORDER BY ticker`

	rows, err := database.GetPool().Query(context.Background(), query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var prices []models.MarketPrice
	for rows.Next() {
		var price models.MarketPrice
		if err := rows.Scan(&price.Ticker, &price.Price, &price.Currency, &price.UpdatedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		prices = append(prices, price)
	}

	return c.JSON(prices)
}

// GetMarketPrice returns a specific market price
func GetMarketPrice(c fiber.Ctx) error {
	ticker := c.Params("ticker")

	query := `SELECT ticker, price, currency, updated_at FROM market_prices WHERE ticker = $1`

	var price models.MarketPrice
	err := database.GetPool().QueryRow(context.Background(), query, ticker).
		Scan(&price.Ticker, &price.Price, &price.Currency, &price.UpdatedAt)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Market price not found"})
	}

	return c.JSON(price)
}

