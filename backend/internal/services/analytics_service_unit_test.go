package services

import (
	"context"
	"testing"
	"time"

	"fintu-tracking-backend/internal/models"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeAnalyticsRepository is an in-memory AnalyticsRepository for unit tests.
// It does not require a database; each field controls what the corresponding
// method returns so a test can drive the service with deterministic data.
type fakeAnalyticsRepository struct {
	holdingTrades                []models.AnalyticsHoldingTradeRow
	holdingTradesErr             error
	marketPrices                 []models.AnalyticsMarketPriceRow
	marketPricesErr              error
	fxImpactCashFlows            []models.AnalyticsFXImpactCashFlowRow
	fxImpactErr                  error
	latestFXRate                 string
	latestFXRateErr              error
	fxRatePeriods                []models.AnalyticsFXRatePeriodRow
	fxRatePeriodsErr             error
	cashFlowsBalance             string
	cashFlowsBalanceErr          error
	netTradeCashFlow             string
	netTradeCashFlowErr          error
	netInvested                  string
	netInvestedErr               error
	transferFees                 string
	transferFeesErr              error
	tradingFees                  string
	tradingFeesErr               error
	xirrCashFlows                []models.AnalyticsXIRRCashFlowRow
	xirrCashFlowsErr             error
	localCurrencyTotals          models.AnalyticsLocalCurrencyTotals
	localCurrencyTotalsErr       error
	returnAttributionFees        models.AnalyticsReturnAttributionFeesRow
	returnAttributionFeesErr     error
	returnAttributionHoldings    []models.AnalyticsReturnAttributionHoldingRow
	returnAttributionHoldingsErr error
	performanceSnapshots         []models.AnalyticsPerformanceSnapshotRow
	performanceSnapshotsErr      error
	performanceCashFlows         []models.AnalyticsPerformanceCashFlowRow
	performanceCashFlowsErr      error
	performanceTrades            []models.AnalyticsPerformanceTradeRow
	performanceTradesErr         error
	realizedPLTrades             []models.AnalyticsRealizedPLRow
	realizedPLTradesErr          error
	spyPrices                    []models.AnalyticsSPYPriceRow
	spyPricesErr                 error
}

func (f *fakeAnalyticsRepository) LoadHoldingTrades(ctx context.Context, userID string) ([]models.AnalyticsHoldingTradeRow, error) {
	if f.holdingTradesErr != nil {
		return nil, f.holdingTradesErr
	}
	return f.holdingTrades, nil
}

func (f *fakeAnalyticsRepository) LoadMarketPrices(ctx context.Context) ([]models.AnalyticsMarketPriceRow, error) {
	if f.marketPricesErr != nil {
		return nil, f.marketPricesErr
	}
	return f.marketPrices, nil
}

func (f *fakeAnalyticsRepository) GetFXImpactCashFlows(ctx context.Context, userID string) ([]models.AnalyticsFXImpactCashFlowRow, error) {
	if f.fxImpactErr != nil {
		return nil, f.fxImpactErr
	}
	return f.fxImpactCashFlows, nil
}

func (f *fakeAnalyticsRepository) GetLatestFXRate(ctx context.Context, userID string) (string, error) {
	if f.latestFXRateErr != nil {
		return "", f.latestFXRateErr
	}
	return f.latestFXRate, nil
}

func (f *fakeAnalyticsRepository) GetFXRatePeriods(ctx context.Context, userID string) ([]models.AnalyticsFXRatePeriodRow, error) {
	if f.fxRatePeriodsErr != nil {
		return nil, f.fxRatePeriodsErr
	}
	return f.fxRatePeriods, nil
}

func (f *fakeAnalyticsRepository) GetCashFlowsBalance(ctx context.Context, userID string) (string, error) {
	if f.cashFlowsBalanceErr != nil {
		return "", f.cashFlowsBalanceErr
	}
	return f.cashFlowsBalance, nil
}

func (f *fakeAnalyticsRepository) GetNetTradeCashFlow(ctx context.Context, userID string) (string, error) {
	if f.netTradeCashFlowErr != nil {
		return "", f.netTradeCashFlowErr
	}
	return f.netTradeCashFlow, nil
}

func (f *fakeAnalyticsRepository) GetNetInvested(ctx context.Context, userID string) (string, error) {
	if f.netInvestedErr != nil {
		return "", f.netInvestedErr
	}
	return f.netInvested, nil
}

func (f *fakeAnalyticsRepository) GetTransferFees(ctx context.Context, userID string) (string, error) {
	if f.transferFeesErr != nil {
		return "", f.transferFeesErr
	}
	return f.transferFees, nil
}

func (f *fakeAnalyticsRepository) GetTradingFees(ctx context.Context, userID string) (string, error) {
	if f.tradingFeesErr != nil {
		return "", f.tradingFeesErr
	}
	return f.tradingFees, nil
}

func (f *fakeAnalyticsRepository) GetXIRRCashFlows(ctx context.Context, userID string) ([]models.AnalyticsXIRRCashFlowRow, error) {
	if f.xirrCashFlowsErr != nil {
		return nil, f.xirrCashFlowsErr
	}
	return f.xirrCashFlows, nil
}

func (f *fakeAnalyticsRepository) GetLocalCurrencyTotals(ctx context.Context, userID string) (models.AnalyticsLocalCurrencyTotals, error) {
	if f.localCurrencyTotalsErr != nil {
		return models.AnalyticsLocalCurrencyTotals{}, f.localCurrencyTotalsErr
	}
	return f.localCurrencyTotals, nil
}

func (f *fakeAnalyticsRepository) GetReturnAttributionFees(ctx context.Context, userID string) (models.AnalyticsReturnAttributionFeesRow, error) {
	if f.returnAttributionFeesErr != nil {
		return models.AnalyticsReturnAttributionFeesRow{}, f.returnAttributionFeesErr
	}
	return f.returnAttributionFees, nil
}

func (f *fakeAnalyticsRepository) GetReturnAttributionHoldings(ctx context.Context, userID string) ([]models.AnalyticsReturnAttributionHoldingRow, error) {
	if f.returnAttributionHoldingsErr != nil {
		return nil, f.returnAttributionHoldingsErr
	}
	return f.returnAttributionHoldings, nil
}

func (f *fakeAnalyticsRepository) GetPerformanceSnapshots(ctx context.Context, userID string) ([]models.AnalyticsPerformanceSnapshotRow, error) {
	if f.performanceSnapshotsErr != nil {
		return nil, f.performanceSnapshotsErr
	}
	return f.performanceSnapshots, nil
}

func (f *fakeAnalyticsRepository) GetPerformanceActivityCashFlows(ctx context.Context, userID string) ([]models.AnalyticsPerformanceCashFlowRow, error) {
	if f.performanceCashFlowsErr != nil {
		return nil, f.performanceCashFlowsErr
	}
	return f.performanceCashFlows, nil
}

func (f *fakeAnalyticsRepository) GetPerformanceActivityTrades(ctx context.Context, userID string) ([]models.AnalyticsPerformanceTradeRow, error) {
	if f.performanceTradesErr != nil {
		return nil, f.performanceTradesErr
	}
	return f.performanceTrades, nil
}

func (f *fakeAnalyticsRepository) GetRealizedPLTrades(ctx context.Context, userID string) ([]models.AnalyticsRealizedPLRow, error) {
	if f.realizedPLTradesErr != nil {
		return nil, f.realizedPLTradesErr
	}
	return f.realizedPLTrades, nil
}

func (f *fakeAnalyticsRepository) GetSPYBenchmarkPrices(ctx context.Context) ([]models.AnalyticsSPYPriceRow, error) {
	if f.spyPricesErr != nil {
		return nil, f.spyPricesErr
	}
	return f.spyPrices, nil
}

// --- helpers --------------------------------------------------------------

// --- GetCurrentHoldings ---------------------------------------------------

func TestAnalyticsService_Unit_GetCurrentHoldings_ComputesFromTradesAndPrices(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{
		holdingTrades: []models.AnalyticsHoldingTradeRow{
			{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), CreatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), Ticker: "AAPL", AssetType: "stock", Side: "buy", Quantity: "5", Price: "150", TotalFees: "0"},
			{Date: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), CreatedAt: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), Ticker: "AAPL", AssetType: "stock", Side: "buy", Quantity: "5", Price: "160", TotalFees: "0"},
		},
		marketPrices: []models.AnalyticsMarketPriceRow{
			{Ticker: "AAPL", Price: "200"},
		},
	}
	svc := NewAnalyticsService(fake)

	holdings, err := svc.GetCurrentHoldings(context.Background(), "user-1")
	require.NoError(t, err)
	require.Len(t, holdings, 1)
	h := holdings[0]
	assert.Equal(t, "AAPL", h.Ticker)
	assert.Equal(t, "10", h.Quantity)
	assert.Equal(t, "2000", h.MarketValue)
	assert.Equal(t, "stock", h.AssetType)
}

func TestAnalyticsService_Unit_GetCurrentHoldings_EmptyTradesReturnsNoHoldings(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{}
	svc := NewAnalyticsService(fake)

	holdings, err := svc.GetCurrentHoldings(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Empty(t, holdings)
}

func TestAnalyticsService_Unit_GetCurrentHoldings_SoldOutPositionExcluded(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{
		holdingTrades: []models.AnalyticsHoldingTradeRow{
			{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), CreatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), Ticker: "AAPL", AssetType: "stock", Side: "buy", Quantity: "5", Price: "150", TotalFees: "0"},
			{Date: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), CreatedAt: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), Ticker: "AAPL", AssetType: "stock", Side: "sell", Quantity: "5", Price: "160", TotalFees: "0"},
		},
		marketPrices: []models.AnalyticsMarketPriceRow{
			{Ticker: "AAPL", Price: "200"},
		},
	}
	svc := NewAnalyticsService(fake)

	holdings, err := svc.GetCurrentHoldings(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Empty(t, holdings)
}

// --- GetNetWorthSummary ---------------------------------------------------

func TestAnalyticsService_Unit_GetNetWorthSummary_ComputesFromBalancesAndHoldings(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{
		holdingTrades: []models.AnalyticsHoldingTradeRow{
			{Date: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), CreatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), Ticker: "AAPL", AssetType: "stock", Side: "buy", Quantity: "5", Price: "150", TotalFees: "0"},
		},
		marketPrices: []models.AnalyticsMarketPriceRow{
			{Ticker: "AAPL", Price: "200"},
		},
		cashFlowsBalance:    "1000",
		netTradeCashFlow:    "750",
		netInvested:         "1000",
		transferFees:        "0",
		tradingFees:         "0",
		xirrCashFlows:       nil,
		localCurrencyTotals: models.AnalyticsLocalCurrencyTotals{TotalDeposited: "4000000", TotalWithdrawn: "0"},
	}
	svc := NewAnalyticsService(fake)

	summary, err := svc.GetNetWorthSummary(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Equal(t, "1000", summary.HoldingsValue)
	assert.Equal(t, "250", summary.CashBalance)
	assert.Equal(t, "1250", summary.NetWorth)
	assert.Equal(t, "1000", summary.TotalInvested)
	assert.Equal(t, "4000000", summary.TotalDepositedCOP)
}

func TestAnalyticsService_Unit_GetNetWorthSummary_ZeroHoldingsGivesZeroNetWorth(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{
		cashFlowsBalance:    "0",
		netTradeCashFlow:    "0",
		netInvested:         "0",
		transferFees:        "0",
		tradingFees:         "0",
		localCurrencyTotals: models.AnalyticsLocalCurrencyTotals{},
	}
	svc := NewAnalyticsService(fake)

	summary, err := svc.GetNetWorthSummary(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Equal(t, "0", summary.HoldingsValue)
	assert.Equal(t, "0", summary.NetWorth)
	assert.Equal(t, "0", summary.TotalGainLoss)
}

// --- CalculateReturnAttribution ------------------------------------------

func TestAnalyticsService_Unit_CalculateReturnAttribution_ComputesFromHoldingsAndFees(t *testing.T) {
	t.Parallel()

	netQty := "5"
	cost := "750"
	price := "200"
	fake := &fakeAnalyticsRepository{
		netInvested:  "1000",
		transferFees: "10",
		tradingFees:  "5",
		returnAttributionHoldings: []models.AnalyticsReturnAttributionHoldingRow{
			{Ticker: "AAPL", NetQuantity: &netQty, TotalCost: &cost, CurrentPrice: &price},
		},
		cashFlowsBalance: "1000",
		netTradeCashFlow: "750",
	}
	svc := NewAnalyticsService(fake)

	attr, err := svc.CalculateReturnAttribution(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Equal(t, "1000", attr.StartingCapital)
	assert.Equal(t, "15", attr.TotalFeesImpact)
	assert.Equal(t, "1250", attr.NetPosition)
	assert.Equal(t, "10", attr.DepositFeesImpact)
	assert.Equal(t, "5", attr.TradingFeesImpact)
	assert.Equal(t, "0", attr.ClosingFeesImpact)
}

func TestAnalyticsService_Unit_CalculateReturnAttribution_EmptyHoldingsGivesZeroMarketGains(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{
		netInvested:               "0",
		transferFees:              "0",
		tradingFees:               "0",
		returnAttributionHoldings: nil,
		cashFlowsBalance:          "0",
		netTradeCashFlow:          "0",
	}
	svc := NewAnalyticsService(fake)

	attr, err := svc.CalculateReturnAttribution(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Equal(t, "0", attr.MarketGains)
	assert.Equal(t, "0", attr.NetPosition)
	assert.Equal(t, "0", attr.NetReturnPct)
}

// --- GetPerformanceTimeSeries --------------------------------------------

func TestAnalyticsService_Unit_GetPerformanceTimeSeries_BuildsFromActivityWhenNoSnapshots(t *testing.T) {
	t.Parallel()

	day1 := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	day2 := time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC)
	fake := &fakeAnalyticsRepository{
		performanceSnapshots: nil,
		performanceCashFlows: []models.AnalyticsPerformanceCashFlowRow{
			{Date: day1, Type: "deposit", USDAmount: "1000"},
		},
		performanceTrades: []models.AnalyticsPerformanceTradeRow{
			{Date: day2, Side: "buy", Ticker: "AAPL", Quantity: "5", Price: "150", TotalFees: "0", IsOpeningPosition: true},
		},
		spyPrices: nil,
	}
	svc := NewAnalyticsService(fake)

	points, err := svc.GetPerformanceTimeSeries(context.Background(), "user-1", "day")
	require.NoError(t, err)
	require.NotEmpty(t, points)
	assert.Equal(t, day1, points[0].Date)
	assert.Equal(t, "1000", points[0].InvestedCapital)
}

func TestAnalyticsService_Unit_GetPerformanceTimeSeries_UsesSnapshotsWhenPresent(t *testing.T) {
	t.Parallel()

	day1 := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	day2 := time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC)
	fake := &fakeAnalyticsRepository{
		performanceSnapshots: []models.AnalyticsPerformanceSnapshotRow{
			{SnapshotDate: day1, TotalValueUSD: "1000", TotalInvestedUSD: "900", TotalFeesUSD: "10", TotalFXImpactUSD: "0"},
			{SnapshotDate: day2, TotalValueUSD: "1200", TotalInvestedUSD: "900", TotalFeesUSD: "10", TotalFXImpactUSD: "0"},
		},
		spyPrices: nil,
	}
	svc := NewAnalyticsService(fake)

	points, err := svc.GetPerformanceTimeSeries(context.Background(), "user-1", "day")
	require.NoError(t, err)
	require.Len(t, points, 2)
	assert.Equal(t, "1000", points[0].PortfolioValue)
	assert.Equal(t, "100", points[0].NetReturn)
}

// --- CalculateFXImpact ---------------------------------------------------

func TestAnalyticsService_Unit_CalculateFXImpact_WeightedAverageFromCashFlows(t *testing.T) {
	t.Parallel()

	rate4000 := "4000"
	rate4500 := "4500"
	fake := &fakeAnalyticsRepository{
		fxImpactCashFlows: []models.AnalyticsFXImpactCashFlowRow{
			{USDAmount: "100", FXRate: &rate4000},
			{USDAmount: "100", FXRate: &rate4500},
		},
		latestFXRate: "4500",
	}
	svc := NewAnalyticsService(fake)

	report, err := svc.CalculateFXImpact(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Equal(t, "4250", report.AvgInvestmentRate)
	assert.Equal(t, "4500", report.CurrentRate)

	wantUSD := dec("200").Mul(dec("4500").Sub(dec("4250"))).Div(dec("4500"))
	assert.True(t, dec(report.FXImpactUSD).Equal(wantUSD), "FXImpactUSD = %s, want %s", report.FXImpactUSD, wantUSD)
	wantPct := wantUSD.Div(dec("200")).Mul(decimal.NewFromInt(100))
	assert.True(t, dec(report.FXImpactPct).Equal(wantPct), "FXImpactPct = %s, want %s", report.FXImpactPct, wantPct)
	assert.True(t, dec(report.UsdConverted).Equal(dec("200")), "UsdConverted = %s, want 200", report.UsdConverted)
}

func TestAnalyticsService_Unit_CalculateFXImpact_ZeroRatesLeaveImpactZero(t *testing.T) {
	t.Parallel()

	rate4000 := "4000"
	rate4500 := "4500"
	deposits := []models.AnalyticsFXImpactCashFlowRow{
		{USDAmount: "100", FXRate: &rate4000},
		{USDAmount: "100", FXRate: &rate4500},
	}

	t.Run("current rate zero", func(t *testing.T) {
		t.Parallel()
		fake := &fakeAnalyticsRepository{
			fxImpactCashFlows: deposits,
			latestFXRate:      "0",
		}
		svc := NewAnalyticsService(fake)

		report, err := svc.CalculateFXImpact(context.Background(), "user-1")
		require.NoError(t, err)
		assert.Equal(t, "0", report.FXImpactUSD)
		assert.Equal(t, "0", report.FXImpactPct)
		assert.True(t, dec(report.UsdConverted).Equal(dec("200")), "UsdConverted = %s, want 200", report.UsdConverted)
	})

	t.Run("avg rate zero", func(t *testing.T) {
		t.Parallel()
		fake := &fakeAnalyticsRepository{
			fxImpactCashFlows: nil,
			latestFXRate:      "4500",
		}
		svc := NewAnalyticsService(fake)

		report, err := svc.CalculateFXImpact(context.Background(), "user-1")
		require.NoError(t, err)
		assert.Equal(t, "0", report.AvgInvestmentRate)
		assert.Equal(t, "0", report.FXImpactUSD)
		assert.Equal(t, "0", report.FXImpactPct)
		assert.Equal(t, "0", report.UsdConverted)
	})
}

func TestAnalyticsService_Unit_CalculateFXImpact_NoCashFlowsGivesZeroAvg(t *testing.T) {
	t.Parallel()

	fake := &fakeAnalyticsRepository{
		fxImpactCashFlows: nil,
		latestFXRate:      "4000",
	}
	svc := NewAnalyticsService(fake)

	report, err := svc.CalculateFXImpact(context.Background(), "user-1")
	require.NoError(t, err)
	assert.Equal(t, "0", report.AvgInvestmentRate)
}

// --- RealizedPLByTradeID -------------------------------------------------

func TestAnalyticsService_Unit_RealizedPLByTradeID_ComputesAverageCost(t *testing.T) {
	t.Parallel()

	day1 := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	day2 := time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC)
	fake := &fakeAnalyticsRepository{
		realizedPLTrades: []models.AnalyticsRealizedPLRow{
			{ID: "t1", Date: day1, CreatedAt: day1, Ticker: "AAPL", Side: "buy", Quantity: "10", Price: "100", TotalFees: "0"},
			{ID: "t2", Date: day2, CreatedAt: day2, Ticker: "AAPL", Side: "sell", Quantity: "5", Price: "150", TotalFees: "0"},
		},
	}
	svc := NewAnalyticsService(fake)

	result, err := svc.RealizedPLByTradeID(context.Background(), "user-1")
	require.NoError(t, err)
	require.Contains(t, result, "t2")
	want := decimal.NewFromInt(250)
	assert.True(t, result["t2"].Equal(want), "realized PL = %s, want %s", result["t2"], want)
}

// --- weightedAvgFXRate ---------------------------------------------------

func TestWeightedAvgFXRate_WeightedByAmount(t *testing.T) {
	t.Parallel()

	rate4000 := "4000"
	rate4500 := "4500"
	rows := []models.AnalyticsFXImpactCashFlowRow{
		{USDAmount: "100", FXRate: &rate4000},
		{USDAmount: "300", FXRate: &rate4500},
	}
	got, usd := weightedAvgFXRate(rows)
	want := dec("4375")
	assert.True(t, dec(got).Equal(want), "weighted avg = %s, want %s", got, want)
	assert.True(t, usd.Equal(dec("400")), "usd deposited = %s, want 400", usd)
}
