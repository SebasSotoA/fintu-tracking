package handlers

import (
	"net/http"
	"time"

	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/services"
)

// GetFeeBreakdown handles GET /api/analytics/fee-breakdown
func GetFeeBreakdown(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	dateRange := parseDateRange(r)

	breakdown, err := feeService.GetTotalFeesByType(r.Context(), userID, dateRange)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to calculate fee breakdown: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, breakdown)
}

// GetFeeImpact handles GET /api/analytics/fee-impact
func GetFeeImpact(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	ticker := r.URL.Query().Get("ticker")

	if ticker == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]any{
			"error": "Ticker parameter is required",
		})
		return
	}

	impact, err := feeService.GetFeeImpactOnReturn(r.Context(), userID, ticker)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to calculate fee impact: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, impact)
}

// GetFeeEfficiency handles GET /api/analytics/fee-efficiency
func GetFeeEfficiency(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	groupBy := r.URL.Query().Get("group_by")
	if groupBy == "" {
		groupBy = "ticker"
	}

	efficiency, err := feeService.GetFeeEfficiency(r.Context(), userID, groupBy)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to calculate fee efficiency: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, efficiency)
}

// GetReturnAttribution handles GET /api/analytics/return-attribution
func GetReturnAttribution(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	attribution, err := analyticsService.CalculateReturnAttribution(r.Context(), userID)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to calculate return attribution: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, attribution)
}

// GetFXImpact handles GET /api/analytics/fx-impact
func GetFXImpact(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	fxReport, err := analyticsService.CalculateFXImpact(r.Context(), userID)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to calculate FX impact: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, fxReport)
}

// GetPerformanceTimeSeries handles GET /api/analytics/performance-time-series
func GetPerformanceTimeSeries(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	interval := r.URL.Query().Get("interval")
	if interval == "" {
		interval = "day"
	}

	timeSeries, err := analyticsService.GetPerformanceTimeSeries(r.Context(), userID, interval)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to get performance time series: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, timeSeries)
}

// GetNetWorth handles GET /api/analytics/net-worth
func GetNetWorth(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	netWorth, err := analyticsService.GetNetWorthSummary(r.Context(), userID)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to calculate net worth: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, netWorth)
}

// GetCashReconciliation handles GET /api/analytics/cash-reconciliation
func GetCashReconciliation(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	report, err := feeService.ReconcileCashFlowFees(r.Context(), userID)
	if err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]any{
			"error": "Failed to reconcile cash flows: " + err.Error(),
		})
		return
	}

	httpx.JSON(w, http.StatusOK, report)
}

// Helper function to parse date range from query parameters
func parseDateRange(r *http.Request) *services.DateRange {
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

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