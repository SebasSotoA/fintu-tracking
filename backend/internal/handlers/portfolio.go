package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"
	"fintu-tracking-backend/internal/utils"
	"strings"

	"github.com/gofiber/fiber/v3"
)

var twelveDataSvc = services.NewTwelveDataService(nil)

// InitTwelveDataService wires the DB pool into the Twelve Data service singleton.
func InitTwelveDataService() {
	twelveDataSvc = services.NewTwelveDataService(database.GetPool())
}

// RefreshMarketPrices fetches live quotes for held tickers and updates market_prices.
func RefreshMarketPrices(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	result, err := twelveDataSvc.RefreshMarketPrices(context.Background(), userID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "rate limit") {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   err.Error(),
				"updated": result.Updated,
				"tickers": result.Tickers,
				"errors":  result.Errors,
			})
		}
		if strings.Contains(err.Error(), "TWELVE_DATA_API_KEY") {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   err.Error(),
			"updated": result.Updated,
			"tickers": result.Tickers,
			"errors":  result.Errors,
		})
	}

	return c.JSON(result)
}

// GetHoldings calculates and returns current holdings
func GetHoldings(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	query := `
		SELECT id, user_id, date, ticker, asset_type, side, quantity, price, fee,
			COALESCE(deposit_fee, 0), COALESCE(trading_fee, 0), COALESCE(closing_fee, 0),
			COALESCE(total_fees, 0), total, notes, created_at, updated_at
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC
	`

	rows, err := database.GetPool().Query(context.Background(), query, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	trades := make([]models.Trade, 0)
	for rows.Next() {
		trade, err := scanTradeRow(rows)
		if err != nil {
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

	prices := make([]models.MarketPrice, 0)
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

