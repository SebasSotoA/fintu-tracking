package handlers

import (
	"time"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
)

// GetFeeBreakdown handles GET /api/analytics/fee-breakdown
func GetFeeBreakdown(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	dateRange := parseDateRange(c)

	feeService := services.NewFeeService(database.GetPool())
	breakdown, err := feeService.GetTotalFeesByType(c.Context(), userID, dateRange)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate fee breakdown: " + err.Error(),
		})
	}

	return c.JSON(breakdown)
}

// GetFeeImpact handles GET /api/analytics/fee-impact
func GetFeeImpact(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	ticker := c.Query("ticker")

	if ticker == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Ticker parameter is required",
		})
	}

	feeService := services.NewFeeService(database.GetPool())
	impact, err := feeService.GetFeeImpactOnReturn(c.Context(), userID, ticker)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate fee impact: " + err.Error(),
		})
	}

	return c.JSON(impact)
}

// GetFeeEfficiency handles GET /api/analytics/fee-efficiency
func GetFeeEfficiency(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	groupBy := c.Query("group_by", "ticker")

	feeService := services.NewFeeService(database.GetPool())
	efficiency, err := feeService.GetFeeEfficiency(c.Context(), userID, groupBy)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate fee efficiency: " + err.Error(),
		})
	}

	return c.JSON(efficiency)
}

// GetReturnAttribution handles GET /api/analytics/return-attribution
func GetReturnAttribution(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	analyticsService := services.NewAnalyticsService(database.GetPool())
	attribution, err := analyticsService.CalculateReturnAttribution(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate return attribution: " + err.Error(),
		})
	}

	return c.JSON(attribution)
}

// GetFXImpact handles GET /api/analytics/fx-impact
func GetFXImpact(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	analyticsService := services.NewAnalyticsService(database.GetPool())
	fxReport, err := analyticsService.CalculateFXImpact(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate FX impact: " + err.Error(),
		})
	}

	return c.JSON(fxReport)
}

// GetPerformanceTimeSeries handles GET /api/analytics/performance-time-series
func GetPerformanceTimeSeries(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	interval := c.Query("interval", "day")

	analyticsService := services.NewAnalyticsService(database.GetPool())
	timeSeries, err := analyticsService.GetPerformanceTimeSeries(c.Context(), userID, interval)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get performance time series: " + err.Error(),
		})
	}

	return c.JSON(timeSeries)
}

// GetNetWorth handles GET /api/analytics/net-worth
func GetNetWorth(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	analyticsService := services.NewAnalyticsService(database.GetPool())
	netWorth, err := analyticsService.GetNetWorthSummary(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate net worth: " + err.Error(),
		})
	}

	return c.JSON(netWorth)
}

// GetCashBreakdown handles GET /api/analytics/cash-breakdown
func GetCashBreakdown(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	analyticsService := services.NewAnalyticsService(database.GetPool())
	breakdown, err := analyticsService.GetCashBreakdown(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate cash breakdown: " + err.Error(),
		})
	}

	return c.JSON(breakdown)
}

// GetCashReconciliation handles GET /api/analytics/cash-reconciliation
func GetCashReconciliation(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	feeService := services.NewFeeService(database.GetPool())
	report, err := feeService.ReconcileCashFlowFees(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to reconcile cash flows: " + err.Error(),
		})
	}

	return c.JSON(report)
}

// Helper function to parse date range from query parameters
func parseDateRange(c fiber.Ctx) *services.DateRange {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var dateRange *services.DateRange

	if startDateStr != "" || endDateStr != "" {
		dateRange = &services.DateRange{}

		if startDateStr != "" {
			if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
				dateRange.StartDate = &startDate
			}
		}

		if endDateStr != "" {
			if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
				dateRange.EndDate = &endDate
			}
		}
	}

	return dateRange
}
