package handlers

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/go-chi/chi/v5"
)

var twelveDataSvc = services.NewTwelveDataService(nil)

// InitTwelveDataService wires the DB pool into the Twelve Data service singleton.
func InitTwelveDataService() {
	twelveDataSvc = services.NewTwelveDataService(database.GetPool())
}

// RefreshMarketPrices fetches live quotes for held tickers and updates market_prices.
func RefreshMarketPrices(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	result, err := twelveDataSvc.RefreshMarketPrices(context.Background(), userID)
	if err != nil {
		var rateLimitErr *services.RateLimitError
		if errors.As(err, &rateLimitErr) {
			retryAfterSeconds := int(math.Ceil(rateLimitErr.RetryAfter.Seconds()))
			w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfterSeconds))
			httpx.JSON(w, http.StatusTooManyRequests, map[string]any{
				"error":        err.Error(),
				"retry_after":  retryAfterSeconds,
				"updated":      result.Updated,
				"tickers":      result.Tickers,
				"errors":       result.Errors,
			})
			return
		}
		if strings.Contains(strings.ToLower(err.Error()), "rate limit") {
			httpx.JSON(w, http.StatusTooManyRequests, map[string]any{
				"error":   err.Error(),
				"updated": result.Updated,
				"tickers": result.Tickers,
				"errors":  result.Errors,
			})
			return
		}
		if strings.Contains(err.Error(), "TWELVE_DATA_API_KEY") {
			httpx.Error(w, http.StatusServiceUnavailable, err.Error())
			return
		}
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error":   err.Error(),
			"updated": result.Updated,
			"tickers": result.Tickers,
			"errors":  result.Errors,
		})
		return
	}

	httpx.JSON(w, http.StatusOK, result)
}

// GetHoldings calculates and returns current holdings.
// Without page/page_size query params, returns a plain JSON array (legacy).
// With pagination params, returns models.PaginatedResponse sorted by market value descending.
func GetHoldings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")

	analyticsService := services.NewAnalyticsService(database.GetPool())
	ctx := context.Background()

	if !paginationRequested(pageStr, pageSizeStr) {
		holdings, err := analyticsService.GetCurrentHoldings(ctx, userID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, holdings)
		return
	}

	params, err := parsePaginationParams(pageStr, pageSizeStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	holdings, err := analyticsService.GetCurrentHoldingsByMarketValue(ctx, userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, paginateHoldings(holdings, params.page, params.pageSize))
}

// ListMarketPrices returns all market prices
func ListMarketPrices(w http.ResponseWriter, r *http.Request) {
	query := `SELECT ticker, price, currency, updated_at FROM market_prices ORDER BY ticker`

	rows, err := database.GetPool().Query(context.Background(), query)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	prices := make([]models.MarketPrice, 0)
	for rows.Next() {
		var price models.MarketPrice
		if err := rows.Scan(&price.Ticker, &price.Price, &price.Currency, &price.UpdatedAt); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		prices = append(prices, price)
	}

	httpx.JSON(w, http.StatusOK, prices)
}

// GetMarketPrice returns a specific market price
func GetMarketPrice(w http.ResponseWriter, r *http.Request) {
	ticker := chi.URLParam(r, "ticker")

	query := `SELECT ticker, price, currency, updated_at FROM market_prices WHERE ticker = $1`

	var price models.MarketPrice
	err := database.GetPool().QueryRow(context.Background(), query, ticker).
		Scan(&price.Ticker, &price.Price, &price.Currency, &price.UpdatedAt)

	if err != nil {
		httpx.Error(w, http.StatusNotFound, "Market price not found")
		return
	}

	httpx.JSON(w, http.StatusOK, price)
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