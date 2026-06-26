package handlers

import (
	"context"
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"
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

// GetHoldings calculates and returns current holdings.
// Without page/page_size query params, returns a plain JSON array (legacy).
// With pagination params, returns models.PaginatedResponse sorted by market value descending.
func GetHoldings(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	pageStr := c.Query("page")
	pageSizeStr := c.Query("page_size")

	analyticsService := services.NewAnalyticsService(database.GetPool())
	ctx := context.Background()

	if !paginationRequested(pageStr, pageSizeStr) {
		holdings, err := analyticsService.GetCurrentHoldings(ctx, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(holdings)
	}

	params, err := parsePaginationParams(pageStr, pageSizeStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	holdings, err := analyticsService.GetCurrentHoldingsByMarketValue(ctx, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(paginateHoldings(holdings, params.page, params.pageSize))
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
		TotalInvested:  "0",
		TotalValue:     "0",
		TotalReturn:    "0",
		TotalReturnPct: "0",
		XIRR:           "0",
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

// paginateHoldings slices a full holdings list into a paginated response,
// clamping the page to the valid range.
func paginateHoldings(holdings []models.Holding, page, pageSize int) models.PaginatedResponse[models.Holding] {
	total := len(holdings)
	page = clampPage(page, total, pageSize)
	start := (page - 1) * pageSize
	end := start + pageSize
	if end > total {
		end = total
	}

	return models.PaginatedResponse[models.Holding]{
		Items:    holdings[start:end],
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}
}
