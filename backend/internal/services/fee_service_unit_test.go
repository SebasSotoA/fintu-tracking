package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"fintu-tracking-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeFeeRepository is an in-memory FeeRepository for unit tests. It does not
// require a database and records calls so assertions can verify the service
// drove the data layer correctly.
type fakeFeeRepository struct {
	feesByType      []models.FeeTypeTotal
	feesByTypeErr   error
	feesByTypeCalls int

	feesByMonth      []models.FeeMonthTotal
	feesByMonthErr   error
	feesByMonthCalls int

	tradeFeeImpact      *models.TradeFeeImpact
	tradeFeeImpactErr   error
	tradeFeeImpactCalls int

	totalTradeFees    string
	totalTradeFeesErr error

	totalCashFlowFees    string
	totalCashFlowFeesErr error

	missingLinks    []string
	missingLinksErr error

	orphaned    []string
	orphanedErr error

	unlinked    []string
	unlinkedErr error

	summary    []models.ReconciliationSummaryRow
	summaryErr error

	efficiency    []models.FeeEfficiencyRow
	efficiencyErr error
}

func (f *fakeFeeRepository) GetFeesByType(ctx context.Context, userID string, startDate, endDate *time.Time) ([]models.FeeTypeTotal, error) {
	f.feesByTypeCalls++
	if f.feesByTypeErr != nil {
		return nil, f.feesByTypeErr
	}
	return f.feesByType, nil
}

func (f *fakeFeeRepository) GetFeesByMonth(ctx context.Context, userID string, startDate, endDate *time.Time) ([]models.FeeMonthTotal, error) {
	f.feesByMonthCalls++
	if f.feesByMonthErr != nil {
		return nil, f.feesByMonthErr
	}
	return f.feesByMonth, nil
}

func (f *fakeFeeRepository) GetTradeFeeImpact(ctx context.Context, userID, ticker string) (*models.TradeFeeImpact, error) {
	f.tradeFeeImpactCalls++
	if f.tradeFeeImpactErr != nil {
		return nil, f.tradeFeeImpactErr
	}
	return f.tradeFeeImpact, nil
}

func (f *fakeFeeRepository) GetTotalTradeFees(ctx context.Context, userID string) (string, error) {
	if f.totalTradeFeesErr != nil {
		return "", f.totalTradeFeesErr
	}
	return f.totalTradeFees, nil
}

func (f *fakeFeeRepository) GetTotalCashFlowFees(ctx context.Context, userID string) (string, error) {
	if f.totalCashFlowFeesErr != nil {
		return "", f.totalCashFlowFeesErr
	}
	return f.totalCashFlowFees, nil
}

func (f *fakeFeeRepository) GetMissingLinks(ctx context.Context, userID string) ([]string, error) {
	if f.missingLinksErr != nil {
		return nil, f.missingLinksErr
	}
	return f.missingLinks, nil
}

func (f *fakeFeeRepository) GetOrphanedFeeCashFlows(ctx context.Context, userID string) ([]string, error) {
	if f.orphanedErr != nil {
		return nil, f.orphanedErr
	}
	return f.orphaned, nil
}

func (f *fakeFeeRepository) GetUnlinkedFeeCashFlows(ctx context.Context, userID string) ([]string, error) {
	if f.unlinkedErr != nil {
		return nil, f.unlinkedErr
	}
	return f.unlinked, nil
}

func (f *fakeFeeRepository) GetReconciliationSummary(ctx context.Context, userID string) ([]models.ReconciliationSummaryRow, error) {
	if f.summaryErr != nil {
		return nil, f.summaryErr
	}
	return f.summary, nil
}

func (f *fakeFeeRepository) GetFeeEfficiencyByTicker(ctx context.Context, userID string) ([]models.FeeEfficiencyRow, error) {
	if f.efficiencyErr != nil {
		return nil, f.efficiencyErr
	}
	return f.efficiency, nil
}

// --- GetTotalFeesByType -----------------------------------------------------

func TestFeeService_GetTotalFeesByType_Unit_ComposesBreakdown(t *testing.T) {
	fake := &fakeFeeRepository{
		feesByType: []models.FeeTypeTotal{
			{FeeType: "deposit", Total: "5"},
			{FeeType: "trading", Total: "12.50"},
			{FeeType: "maintenance", Total: "2"},
		},
		feesByMonth: []models.FeeMonthTotal{
			{MonthKey: "2024-01", Total: "5"},
			{MonthKey: "2024-02", Total: "12.50"},
			{MonthKey: "2024-03", Total: "2"},
		},
	}
	svc := NewFeeService(fake)

	start := mustParseDate(t, "2024-01-01")
	end := mustParseDate(t, "2024-12-31")
	dateRange := &DateRange{StartDate: &start, EndDate: &end}

	breakdown, err := svc.GetTotalFeesByType(context.Background(), "user-1", dateRange)
	require.NoError(t, err)
	assert.Equal(t, "5", breakdown.DepositFees)
	assert.Equal(t, "12.50", breakdown.TradingFees)
	assert.Equal(t, "2", breakdown.MaintenanceFees)
	assert.Equal(t, "0", breakdown.ClosingFees)
	assert.Equal(t, "0", breakdown.OtherFees)
	assert.Equal(t, "19.5", breakdown.TotalFees)
	assert.Equal(t, "5", breakdown.FeesByMonth["2024-01"])
	assert.Equal(t, "12.50", breakdown.FeesByMonth["2024-02"])
	assert.Equal(t, "2", breakdown.FeesByMonth["2024-03"])
	assert.Equal(t, 1, fake.feesByTypeCalls)
	assert.Equal(t, 1, fake.feesByMonthCalls)
}

func TestFeeService_GetTotalFeesByType_Unit_BucketsOtherForUnknownTypes(t *testing.T) {
	fake := &fakeFeeRepository{
		feesByType: []models.FeeTypeTotal{
			{FeeType: "withdrawal", Total: "3"},
		},
	}
	svc := NewFeeService(fake)

	breakdown, err := svc.GetTotalFeesByType(context.Background(), "user-1", nil)
	require.NoError(t, err)
	assert.Equal(t, "3", breakdown.OtherFees)
	assert.Equal(t, "3", breakdown.TotalFees)
	assert.Empty(t, breakdown.FeesByMonth)
}

func TestFeeService_GetTotalFeesByType_Unit_PropagatesRepoError(t *testing.T) {
	fake := &fakeFeeRepository{
		feesByTypeErr: errors.New("db unavailable"),
	}
	svc := NewFeeService(fake)

	_, err := svc.GetTotalFeesByType(context.Background(), "user-1", nil)
	require.Error(t, err)
	assert.ErrorIs(t, err, fake.feesByTypeErr)
}

// --- GetFeeImpactOnReturn --------------------------------------------------

func TestFeeService_GetFeeImpactOnReturn_Unit_ReturnsZerosWhenNoTrades(t *testing.T) {
	fake := &fakeFeeRepository{tradeFeeImpact: nil}
	svc := NewFeeService(fake)

	impact, err := svc.GetFeeImpactOnReturn(context.Background(), "user-1", "AAPL")
	require.NoError(t, err)
	assert.Equal(t, "0", impact["total_fees"])
	assert.Equal(t, "0", impact["total_cost"])
	assert.Equal(t, "0", impact["fee_impact_pct"])
	assert.Equal(t, "0", impact["trade_count"])
}

func TestFeeService_GetFeeImpactOnReturn_Unit_CalculatesImpactPct(t *testing.T) {
	fake := &fakeFeeRepository{
		tradeFeeImpact: &models.TradeFeeImpact{
			NetQuantity: "10",
			TotalCost:   "1000",
			TotalFees:   "25",
			TradeCount:  3,
		},
	}
	svc := NewFeeService(fake)

	impact, err := svc.GetFeeImpactOnReturn(context.Background(), "user-1", "AAPL")
	require.NoError(t, err)
	assert.Equal(t, "25", impact["total_fees"])
	assert.Equal(t, "1000", impact["total_cost"])
	assert.Equal(t, "2.5", impact["fee_impact_pct"])
	assert.Equal(t, "3", impact["trade_count"])
	assert.Equal(t, "10", impact["net_quantity"])
}

func TestFeeService_GetFeeImpactOnReturn_Unit_ZeroCostGivesZeroPct(t *testing.T) {
	fake := &fakeFeeRepository{
		tradeFeeImpact: &models.TradeFeeImpact{
			NetQuantity: "0",
			TotalCost:   "0",
			TotalFees:   "5",
			TradeCount:  1,
		},
	}
	svc := NewFeeService(fake)

	impact, err := svc.GetFeeImpactOnReturn(context.Background(), "user-1", "AAPL")
	require.NoError(t, err)
	assert.Equal(t, "0", impact["fee_impact_pct"])
}

// --- ReconcileCashFlowFees -------------------------------------------------

func TestFeeService_ReconcileCashFlowFees_Unit_ReconciledWhenEverythingMatches(t *testing.T) {
	fake := &fakeFeeRepository{
		totalTradeFees:    "100",
		totalCashFlowFees: "100",
		missingLinks:      []string{},
		orphaned:          []string{},
		unlinked:          []string{},
		summary:           []models.ReconciliationSummaryRow{},
	}
	svc := NewFeeService(fake)

	report, err := svc.ReconcileCashFlowFees(context.Background(), "user-1")
	require.NoError(t, err)
	assert.True(t, report.IsReconciled)
	assert.Equal(t, "100", report.TotalTradeFees)
	assert.Equal(t, "100", report.TotalCashFlowFees)
	assert.Equal(t, "0", report.Difference)
	assert.Empty(t, report.MissingLinks)
	assert.Empty(t, report.OrphanedCashFlows)
	assert.Empty(t, report.UnlinkedCashFlows)
	assert.Empty(t, report.Discrepancies)
}

func TestFeeService_ReconcileCashFlowFees_Unit_FlagsMissingLinks(t *testing.T) {
	fake := &fakeFeeRepository{
		totalTradeFees:    "0",
		totalCashFlowFees: "0",
		missingLinks:      []string{"trade-1", "trade-2"},
	}
	svc := NewFeeService(fake)

	report, err := svc.ReconcileCashFlowFees(context.Background(), "user-1")
	require.NoError(t, err)
	assert.False(t, report.IsReconciled)
	assert.Equal(t, []string{"trade-1", "trade-2"}, report.MissingLinks)
}

func TestFeeService_ReconcileCashFlowFees_Unit_FlagsTotalsMismatch(t *testing.T) {
	fake := &fakeFeeRepository{
		totalTradeFees:    "100",
		totalCashFlowFees: "85",
	}
	svc := NewFeeService(fake)

	report, err := svc.ReconcileCashFlowFees(context.Background(), "user-1")
	require.NoError(t, err)
	assert.False(t, report.IsReconciled)
	assert.Equal(t, "15", report.Difference)
}

func TestFeeService_ReconcileCashFlowFees_Unit_BuildsDiscrepancies(t *testing.T) {
	discrepancyDate := mustParseDate(t, "2024-03-15")
	fake := &fakeFeeRepository{
		totalTradeFees:    "50",
		totalCashFlowFees: "50",
		summary: []models.ReconciliationSummaryRow{
			{
				TradeID:            "trade-1",
				Ticker:             "AAPL",
				Date:               discrepancyDate,
				TradeTotalFees:     "10",
				CashFlowTotalFees:  "8",
				ReconciliationDiff: "2",
			},
		},
	}
	svc := NewFeeService(fake)

	report, err := svc.ReconcileCashFlowFees(context.Background(), "user-1")
	require.NoError(t, err)
	assert.False(t, report.IsReconciled)
	require.Len(t, report.Discrepancies, 1)
	issue := report.Discrepancies[0]
	assert.Equal(t, "trade-1", issue.TradeID)
	assert.Equal(t, "AAPL", issue.Ticker)
	assert.Equal(t, "2024-03-15", issue.Date)
	assert.Equal(t, "10", issue.ExpectedFees)
	assert.Equal(t, "8", issue.ActualCashFlowFees)
	assert.Equal(t, "2", issue.Difference)
	assert.Contains(t, issue.Description, "10")
	assert.Contains(t, issue.Description, "8")
}

// --- GetFeeEfficiency ------------------------------------------------------

func TestFeeService_GetFeeEfficiency_Unit_ReturnsByTicker(t *testing.T) {
	fake := &fakeFeeRepository{
		efficiency: []models.FeeEfficiencyRow{
			{Ticker: "AAPL", TradeCount: 5, TotalFees: "20", TotalValue: "10000", AvgFeePct: "0.2"},
			{Ticker: "MSFT", TradeCount: 2, TotalFees: "10", TotalValue: "5000", AvgFeePct: "0.2"},
		},
	}
	svc := NewFeeService(fake)

	result, err := svc.GetFeeEfficiency(context.Background(), "user-1", "ticker")
	require.NoError(t, err)
	require.NotNil(t, result)
	tickers, ok := result["by_ticker"].([]map[string]string)
	require.True(t, ok)
	require.Len(t, tickers, 2)
	assert.Equal(t, "AAPL", tickers[0]["ticker"])
	assert.Equal(t, "5", tickers[0]["trade_count"])
	assert.Equal(t, "20", tickers[0]["total_fees"])
	assert.Equal(t, "10000", tickers[0]["total_value"])
	assert.Equal(t, "0.2", tickers[0]["avg_fee_pct"])
}

func TestFeeService_GetFeeEfficiency_Unit_NonTickerGroupReturnsEmpty(t *testing.T) {
	fake := &fakeFeeRepository{}
	svc := NewFeeService(fake)

	result, err := svc.GetFeeEfficiency(context.Background(), "user-1", "period")
	require.NoError(t, err)
	assert.Empty(t, result)
}