package services

import (
	"context"
	"fmt"
	"time"

	"fintu-tracking-backend/internal/models"
	"github.com/shopspring/decimal"
)

// FeeService handles fee attribution, reconciliation, and analysis. It holds a
// FeeRepository for data access and applies business rules (composition, mismatch
// detection, report building) on top of the raw rows the repository returns.
type FeeService struct {
	repo FeeRepository
}

// NewFeeService creates a new fee service backed by the given repository.
func NewFeeService(repo FeeRepository) *FeeService {
	return &FeeService{repo: repo}
}

// DateRange represents a time period for analysis.
type DateRange struct {
	StartDate *time.Time
	EndDate   *time.Time
}

// GetTotalFeesByType returns aggregate fees broken down by type. Cash-flow fee
// rows populate deposit/closing/maintenance/other; trading fees come from
// SUM(trades.total_fees) so cash-flow "trading" rows are ignored.
func (s *FeeService) GetTotalFeesByType(ctx context.Context, userID string, dateRange *DateRange) (models.FeeBreakdown, error) {
	breakdown := models.FeeBreakdown{
		DepositFees:     "0",
		TradingFees:     "0",
		ClosingFees:     "0",
		MaintenanceFees: "0",
		OtherFees:       "0",
		TotalFees:       "0",
		FeesByMonth:     make(map[string]string),
	}

	startDate, endDate := rangePtrs(dateRange)
	rows, err := s.repo.GetFeesByType(ctx, userID, startDate, endDate)
	if err != nil {
		return breakdown, err
	}

	totalFees := decimal.Zero
	for _, row := range rows {
		if row.FeeType == "trading" {
			continue
		}
		amt, parseErr := decimal.NewFromString(row.Total)
		totalStr := row.Total
		if parseErr != nil {
			amt = decimal.Zero
			totalStr = "0"
		}
		totalFees = totalFees.Add(amt)

		switch row.FeeType {
		case "deposit":
			breakdown.DepositFees = totalStr
		case "closing":
			breakdown.ClosingFees = totalStr
		case "maintenance":
			breakdown.MaintenanceFees = totalStr
		default:
			breakdown.OtherFees = totalStr
		}
	}

	totalTradeFees, err := s.repo.GetTotalTradeFees(ctx, userID)
	if err != nil {
		return breakdown, fmt.Errorf("failed to get total trade fees: %w", err)
	}
	tradeFees, parseErr := decimal.NewFromString(totalTradeFees)
	if parseErr != nil {
		tradeFees = decimal.Zero
		breakdown.TradingFees = "0"
	} else {
		breakdown.TradingFees = totalTradeFees
	}
	totalFees = totalFees.Add(tradeFees)

	breakdown.TotalFees = totalFees.String()

	monthRows, err := s.repo.GetFeesByMonth(ctx, userID, startDate, endDate)
	if err != nil {
		return breakdown, err
	}
	for _, row := range monthRows {
		breakdown.FeesByMonth[row.MonthKey] = row.Total
	}

	return breakdown, nil
}

// rangePtrs dereferences a DateRange into the start/end pointers the repository
// expects, returning nil,nil when dateRange is nil.
func rangePtrs(dateRange *DateRange) (*time.Time, *time.Time) {
	if dateRange == nil {
		return nil, nil
	}
	return dateRange.StartDate, dateRange.EndDate
}

// GetFeeImpactOnReturn calculates how fees affected returns for a specific
// ticker. When the repository finds no trades, the service returns a zeroed
// result rather than an error.
func (s *FeeService) GetFeeImpactOnReturn(ctx context.Context, userID, ticker string) (map[string]string, error) {
	impact, err := s.repo.GetTradeFeeImpact(ctx, userID, ticker)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate fee impact: %w", err)
	}
	if impact == nil {
		return map[string]string{
			"total_fees":     "0",
			"total_cost":     "0",
			"fee_impact_pct": "0",
			"trade_count":    "0",
		}, nil
	}

	cost, _ := decimal.NewFromString(impact.TotalCost)
	fees, _ := decimal.NewFromString(impact.TotalFees)

	feeImpactPct := "0"
	if !cost.IsZero() {
		feeImpactPct = fees.Div(cost).Mul(decimal.NewFromInt(100)).String()
	}

	return map[string]string{
		"total_fees":     impact.TotalFees,
		"total_cost":     impact.TotalCost,
		"fee_impact_pct": feeImpactPct,
		"trade_count":    fmt.Sprintf("%d", impact.TradeCount),
		"net_quantity":   impact.NetQuantity,
	}, nil
}

// ReconcileCashFlowFees checks that all trade fees have corresponding cash
// flows. The repository exposes one method per SQL query; the service composes
// them into a ReconciliationReport, computing the aggregate difference, building
// issue descriptions, and flipping IsReconciled when any problem is found.
func (s *FeeService) ReconcileCashFlowFees(ctx context.Context, userID string) (models.ReconciliationReport, error) {
	report := models.ReconciliationReport{
		IsReconciled:      true,
		MissingLinks:      []string{},
		OrphanedCashFlows: []string{},
		UnlinkedCashFlows: []string{},
		Discrepancies:     []models.ReconciliationIssue{},
	}

	totalTradeFees, err := s.repo.GetTotalTradeFees(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to get total trade fees: %w", err)
	}
	report.TotalTradeFees = totalTradeFees

	totalCashFlowFees, err := s.repo.GetTotalCashFlowFees(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to get total cash flow fees: %w", err)
	}
	report.TotalCashFlowFees = totalCashFlowFees

	tradeFees, _ := decimal.NewFromString(totalTradeFees)
	cashFees, _ := decimal.NewFromString(totalCashFlowFees)
	difference := tradeFees.Sub(cashFees)
	report.Difference = difference.String()

	missingLinks, err := s.repo.GetMissingLinks(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to check missing links: %w", err)
	}
	report.MissingLinks = missingLinks
	if len(missingLinks) > 0 {
		report.IsReconciled = false
	}

	orphaned, err := s.repo.GetOrphanedFeeCashFlows(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to check orphaned cash flows: %w", err)
	}
	report.OrphanedCashFlows = orphaned
	if len(orphaned) > 0 {
		report.IsReconciled = false
	}

	unlinked, err := s.repo.GetUnlinkedFeeCashFlows(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to check unlinked cash flows: %w", err)
	}
	report.UnlinkedCashFlows = unlinked
	if len(unlinked) > 0 {
		report.IsReconciled = false
	}

	summary, err := s.repo.GetReconciliationSummary(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to check discrepancies: %w", err)
	}
	for _, row := range summary {
		expected, _ := decimal.NewFromString(row.TradeTotalFees)
		actual, _ := decimal.NewFromString(row.CashFlowTotalFees)
		diff := expected.Sub(actual)
		report.Discrepancies = append(report.Discrepancies, models.ReconciliationIssue{
			TradeID:            row.TradeID,
			Ticker:             row.Ticker,
			Date:               row.Date.Format("2006-01-02"),
			ExpectedFees:       row.TradeTotalFees,
			ActualCashFlowFees: row.CashFlowTotalFees,
			Difference:         diff.String(),
			Description:        fmt.Sprintf("Trade fee (%s) doesn't match cash flow fees (%s)", row.TradeTotalFees, row.CashFlowTotalFees),
		})
	}
	if len(summary) > 0 {
		report.IsReconciled = false
	}

	if feeTotalsMismatch(difference) {
		report.IsReconciled = false
	}

	return report, nil
}

// feeTotalsMismatch reports whether aggregate trade vs cash-flow fee totals differ beyond tolerance.
func feeTotalsMismatch(difference decimal.Decimal) bool {
	return !difference.IsZero() && difference.Abs().GreaterThan(decimal.NewFromFloat(0.01))
}

// GetFeeEfficiency calculates fee efficiency metrics by ticker or period. The
// repository returns raw per-ticker rows; the service shapes them into the
// response map the frontend expects.
func (s *FeeService) GetFeeEfficiency(ctx context.Context, userID string, groupBy string) (map[string]interface{}, error) {
	if groupBy != "ticker" {
		return map[string]interface{}{}, nil
	}

	rows, err := s.repo.GetFeeEfficiencyByTicker(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate fee efficiency: %w", err)
	}

	results := make(map[string]interface{})
	tickers := make([]map[string]string, 0, len(rows))
	for _, row := range rows {
		tickers = append(tickers, map[string]string{
			"ticker":      row.Ticker,
			"trade_count": fmt.Sprintf("%d", row.TradeCount),
			"total_fees":  row.TotalFees,
			"total_value": row.TotalValue,
			"avg_fee_pct": row.AvgFeePct,
		})
	}

	results["by_ticker"] = tickers
	return results, nil
}
