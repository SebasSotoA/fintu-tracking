package handlers

import (
	"context"
	"time"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
)

// GetFeeAttribution handles GET /api/analytics/fee-attribution
func GetFeeAttribution(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Parse query parameters for date range
	dateRange := parseDateRange(c)

	feeService := services.NewFeeService(database.GetPool())
	attributions, err := feeService.CalculateFeeAttribution(c.Context(), userID, dateRange)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate fee attribution: " + err.Error(),
		})
	}

	return c.JSON(attributions)
}

// GetFeeBreakdown handles GET /api/analytics/fee-breakdown
func GetFeeBreakdown(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

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
	userID := c.Locals("user_id").(string)
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
	userID := c.Locals("user_id").(string)
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
	userID := c.Locals("user_id").(string)

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
	userID := c.Locals("user_id").(string)

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
	userID := c.Locals("user_id").(string)
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
	userID := c.Locals("user_id").(string)

	analyticsService := services.NewAnalyticsService(database.GetPool())
	netWorth, err := analyticsService.GetNetWorthSummary(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate net worth: " + err.Error(),
		})
	}

	return c.JSON(netWorth)
}

// GetCashReconciliation handles GET /api/analytics/cash-reconciliation
func GetCashReconciliation(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	feeService := services.NewFeeService(database.GetPool())
	report, err := feeService.ReconcileCashFlowFees(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to reconcile cash flows: " + err.Error(),
		})
	}

	return c.JSON(report)
}

// CreatePortfolioSnapshot handles POST /api/analytics/portfolio-snapshot
func CreatePortfolioSnapshot(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	analyticsService := services.NewAnalyticsService(database.GetPool())

	// Get current net worth summary
	netWorth, err := analyticsService.GetNetWorthSummary(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate portfolio snapshot: " + err.Error(),
		})
	}

	// Get total fees
	var totalFees string
	err = database.GetPool().QueryRow(context.Background(), `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`, userID).Scan(&totalFees)
	if err != nil {
		totalFees = "0"
	}

	// Insert snapshot
	var snapshotID string
	now := time.Now()
	err = database.GetPool().QueryRow(context.Background(), `
		INSERT INTO portfolio_snapshots (
			user_id, snapshot_date, total_value_usd, total_invested_usd, 
			total_cash_usd, total_fees_usd, total_fx_impact_usd, holdings
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, snapshot_date) 
		DO UPDATE SET
			total_value_usd = EXCLUDED.total_value_usd,
			total_invested_usd = EXCLUDED.total_invested_usd,
			total_cash_usd = EXCLUDED.total_cash_usd,
			total_fees_usd = EXCLUDED.total_fees_usd,
			total_fx_impact_usd = EXCLUDED.total_fx_impact_usd,
			holdings = EXCLUDED.holdings
		RETURNING id
	`,
		userID,
		now.Format("2006-01-02"),
		netWorth.NetWorth,
		netWorth.TotalInvested,
		netWorth.CashBalance,
		totalFees,
		"0",  // FX impact placeholder
		"[]", // Holdings JSON placeholder
	).Scan(&snapshotID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create snapshot: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":            snapshotID,
		"snapshot_date": now.Format("2006-01-02"),
		"message":       "Portfolio snapshot created successfully",
	})
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
