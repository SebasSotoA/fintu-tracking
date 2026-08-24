package services

import (
	"context"

	"fintu-tracking-backend/internal/models"
)

// AnalyticsRepository abstracts database access for the analytics service.
// Implementations live in the repositories package; the service holds this
// interface and applies business rules on top of the raw data it returns.
// Repository methods are pure data accessors — composition, attribution, and
// performance math stay in the service.
//
// Scalar methods return the raw string as produced by Postgres numeric
// aggregates (already COALESCEd to "0" where the service treats NULL as zero);
// the service parses them into decimal.Decimal. Row methods return intermediate
// row types defined in the models package.
type AnalyticsRepository interface {
	// --- holdings.go ---------------------------------------------------------

	// LoadHoldingTrades returns every trade for the user ordered by date then
	// created_at ascending, used to compute current holdings.
	LoadHoldingTrades(ctx context.Context, userID string) ([]models.AnalyticsHoldingTradeRow, error)

	// LoadMarketPrices returns every cached market price (all tickers), used to
	// mark holdings to market.
	LoadMarketPrices(ctx context.Context) ([]models.AnalyticsMarketPriceRow, error)

	// --- fx_impact.go --------------------------------------------------------

	// GetFXImpactCashFlows returns the usd_amount and fx_rate of deposit cash
	// flows with a non-null fx_rate, used for the weighted-average investment
	// rate.
	GetFXImpactCashFlows(ctx context.Context, userID string) ([]models.AnalyticsFXImpactCashFlowRow, error)

	// GetLatestFXRate returns the most recent fx_rates.rate for the user, or ""
	// when no rate exists (ErrNoRows).
	GetLatestFXRate(ctx context.Context, userID string) (string, error)

	// GetFXRatePeriods returns up to 12 monthly average FX rates (period YYYY-MM
	// and rate) ordered by period descending.
	GetFXRatePeriods(ctx context.Context, userID string) ([]models.AnalyticsFXRatePeriodRow, error)

	// --- net_worth.go --------------------------------------------------------

	// GetCashFlowsBalance returns COALESCE(SUM(<cash-flow balance case>), 0) for
	// the user (deposits minus withdrawals plus cash adjustments minus
	// unlinked fees).
	GetCashFlowsBalance(ctx context.Context, userID string) (string, error)

	// GetNetTradeCashFlow returns COALESCE(SUM(<trade cash-flow case>), 0) for
	// the user (non-opening buys minus sells, with fees).
	GetNetTradeCashFlow(ctx context.Context, userID string) (string, error)

	// GetNetInvested returns COALESCE(SUM(deposits - withdrawals), 0) for the
	// user.
	GetNetInvested(ctx context.Context, userID string) (string, error)

	// GetTransferFees returns COALESCE(SUM(usd_amount), 0) for deposit/
	// withdrawal/closing fee cash flows for the user.
	GetTransferFees(ctx context.Context, userID string) (string, error)

	// GetTradingFees returns COALESCE(SUM(total_fees), 0) across all trades for
	// the user.
	GetTradingFees(ctx context.Context, userID string) (string, error)

	// GetXIRRCashFlows returns deposit/withdrawal cash flows ordered by date
	// ascending, used by the XIRR solver.
	GetXIRRCashFlows(ctx context.Context, userID string) ([]models.AnalyticsXIRRCashFlowRow, error)

	// GetLocalCurrencyTotals returns the summed local-currency (config.
	// LocalCurrency) deposits and withdrawals for the user.
	GetLocalCurrencyTotals(ctx context.Context, userID string) (models.AnalyticsLocalCurrencyTotals, error)

	// --- return_attribution.go -----------------------------------------------

	// GetReturnAttributionFees returns per-fee-type (deposit/trading/closing/
	// total) sums for fee cash flows for the user.
	GetReturnAttributionFees(ctx context.Context, userID string) (models.AnalyticsReturnAttributionFeesRow, error)

	// GetReturnAttributionHoldings returns one row per ticker with positive net
	// quantity, its total cost, and current price (from market_prices or the
	// latest trade).
	GetReturnAttributionHoldings(ctx context.Context, userID string) ([]models.AnalyticsReturnAttributionHoldingRow, error)

	// --- analytics_performance_time_series.go --------------------------------

	// GetPerformanceSnapshots returns portfolio_snapshots for the user ordered
	// by snapshot_date ascending.
	GetPerformanceSnapshots(ctx context.Context, userID string) ([]models.AnalyticsPerformanceSnapshotRow, error)

	// GetPerformanceActivityCashFlows returns cash_flows for the user ordered
	// by date ascending, used to synthesize performance points.
	GetPerformanceActivityCashFlows(ctx context.Context, userID string) ([]models.AnalyticsPerformanceCashFlowRow, error)

	// GetPerformanceActivityTrades returns trades for the user ordered by date
	// ascending, used to synthesize performance points.
	GetPerformanceActivityTrades(ctx context.Context, userID string) ([]models.AnalyticsPerformanceTradeRow, error)

	// --- realized_pl.go ------------------------------------------------------

	// GetRealizedPLTrades returns every trade for the user ordered by date then
	// created_at ascending, used to compute realized P/L by trade ID.
	GetRealizedPLTrades(ctx context.Context, userID string) ([]models.AnalyticsRealizedPLRow, error)

	// --- spy_benchmark.go ----------------------------------------------------

	// GetSPYBenchmarkPrices returns SPY market prices ordered by updated_at
	// ascending, used to index the benchmark against the portfolio series.
	GetSPYBenchmarkPrices(ctx context.Context) ([]models.AnalyticsSPYPriceRow, error)
}