package repositories

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresAnalyticsRepository implements services.AnalyticsRepository against
// Postgres. It owns every SQL query the analytics service needs; the service
// applies all business rules and computation on top of the raw rows/scalars
// returned here.
type PostgresAnalyticsRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresAnalyticsRepository returns an AnalyticsRepository backed by the
// given pool. The concrete type is returned (not the interface) so callers in
// the handlers package wire it without importing services, avoiding import
// cycles.
func NewPostgresAnalyticsRepository(pool *pgxpool.Pool) *PostgresAnalyticsRepository {
	return &PostgresAnalyticsRepository{pool: pool}
}

// --- SQL string helpers ----------------------------------------------------

// cashFlowsBalanceCaseExpr computes the per-row cash-flow contribution to the
// spendable cash balance: deposits add, withdrawals subtract, cash adjustments
// add, and only unlinked fees (no related trade or cash flow) subtract. Linked
// fees are mirrored into the trade cash-flow side and must not double-count.
const cashFlowsBalanceCaseExpr = `
  CASE
    WHEN type = 'deposit' THEN usd_amount
    WHEN type = 'withdrawal' THEN -usd_amount
    WHEN type = 'cash_adjustment' THEN usd_amount
    WHEN type = 'fee' AND related_trade_id IS NULL AND related_cash_flow_id IS NULL THEN -usd_amount
    ELSE 0
  END`

// netTradeCashFlowCaseExpr computes the per-trade contribution to the trade
// cash flow: non-opening buys cost (quantity*price + fees), sells return
// (quantity*price - fees). Opening buys are funded by a deposit and do not
// change the trade cash-flow side.
const netTradeCashFlowCaseExpr = `
  CASE
    WHEN side = 'buy' AND COALESCE(is_opening_position, false) = false THEN (quantity * price + COALESCE(total_fees, 0))
    WHEN side = 'sell' THEN -(quantity * price - COALESCE(total_fees, 0))
    ELSE 0
  END`

// netInvestedCaseExpr computes the per-row net-invested contribution: deposits
// add, withdrawals subtract. Fees (linked or standalone) never reduce net
// invested — they are tracked separately in the fee attribution.
const netInvestedCaseExpr = `
  CASE
    WHEN type = 'deposit' THEN usd_amount
    WHEN type = 'withdrawal' THEN -usd_amount
    ELSE 0
  END`

func cashFlowsBalanceSQL() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM cash_flows WHERE user_id = $1`, cashFlowsBalanceCaseExpr)
}

func netTradeCashFlowSQL() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM trades WHERE user_id = $1`, netTradeCashFlowCaseExpr)
}

func netInvestedSQL() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM cash_flows WHERE user_id = $1`, netInvestedCaseExpr)
}

// returnAttributionHoldingsSQL returns one row per ticker with positive net
// quantity: the ticker, net quantity, total cost (buys only), and current
// price (market_prices or latest trade price as fallback).
func returnAttributionHoldingsSQL() string {
	return `
		SELECT 
			t.ticker,
			SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) as net_quantity,
			SUM(CASE WHEN t.side = 'buy' THEN (t.quantity * t.price + COALESCE(t.total_fees, 0)) ELSE 0 END) as total_cost,
			COALESCE(mp.price, (
				SELECT t2.price 
				FROM trades t2 
				WHERE t2.ticker = t.ticker AND t2.user_id = $1
				ORDER BY t2.date DESC, t2.created_at DESC 
				LIMIT 1
			)) as current_price
		FROM trades t
		LEFT JOIN market_prices mp ON t.ticker = mp.ticker
		WHERE t.user_id = $1
		GROUP BY t.ticker, mp.price
		HAVING SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
	`
}

// performanceTradeLoadSQL returns the trade columns used to synthesize
// performance points from activity.
func performanceTradeLoadSQL() string {
	return `
		SELECT date, side, ticker, quantity, price, COALESCE(total_fees, 0), COALESCE(is_opening_position, false)
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC
	`
}

// netWorthHoldingsSQL returns one row per ticker with positive net quantity
// including asset type and fee-aware cost basis. It is retained for SQL-fragment
// tests; the holdings value in net-worth is computed from loadHoldingTrades +
// loadMarketPrices instead.
func netWorthHoldingsSQL() string {
	return `
		SELECT 
			t.ticker,
			t.asset_type,
			SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) as net_quantity,
			SUM(CASE WHEN t.side = 'buy' THEN (t.quantity * t.price + COALESCE(t.total_fees, 0)) ELSE -(t.quantity * t.price - COALESCE(t.total_fees, 0)) END) as cost_basis,
			SUM(CASE WHEN t.side = 'buy' THEN COALESCE(t.total_fees, 0) ELSE 0 END) as total_fees,
			COALESCE(mp.price, (
				SELECT t2.price 
				FROM trades t2 
				WHERE t2.ticker = t.ticker AND t2.user_id = $1
				ORDER BY t2.date DESC, t2.created_at DESC 
				LIMIT 1
			)) as current_price
		FROM trades t
		LEFT JOIN market_prices mp ON t.ticker = mp.ticker
		WHERE t.user_id = $1
		GROUP BY t.ticker, t.asset_type, mp.price
		HAVING SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) > 0
	`
}

// netInvestedSQLAsOfDate returns the net-invested SUM restricted to cash flows
// on or before the given date. Retained for SQL-fragment tests.
func netInvestedSQLAsOfDate() string {
	return fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) FROM cash_flows WHERE user_id = $1 AND date <= $2`, netInvestedCaseExpr)
}

// --- holdings.go ----------------------------------------------------------

// LoadHoldingTrades returns every trade for the user ordered by date then
// created_at ascending, used to compute current holdings.
func (r *PostgresAnalyticsRepository) LoadHoldingTrades(ctx context.Context, userID string) ([]models.AnalyticsHoldingTradeRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, created_at, ticker, asset_type, side, quantity, price, COALESCE(total_fees, 0)
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC, created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load holding trades: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsHoldingTradeRow, error) {
		var tr models.AnalyticsHoldingTradeRow
		return tr, row.Scan(
			&tr.Date,
			&tr.CreatedAt,
			&tr.Ticker,
			&tr.AssetType,
			&tr.Side,
			&tr.Quantity,
			&tr.Price,
			&tr.TotalFees,
		)
	})
}

// LoadMarketPrices returns every cached market price (all tickers), used to
// mark holdings to market.
func (r *PostgresAnalyticsRepository) LoadMarketPrices(ctx context.Context) ([]models.AnalyticsMarketPriceRow, error) {
	rows, err := r.pool.Query(ctx, `SELECT ticker, price, updated_at FROM market_prices`)
	if err != nil {
		return nil, fmt.Errorf("load market prices: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsMarketPriceRow, error) {
		var mp models.AnalyticsMarketPriceRow
		return mp, row.Scan(&mp.Ticker, &mp.Price, &mp.UpdatedAt)
	})
}

// --- fx_impact.go ---------------------------------------------------------

// GetFXImpactCashFlows returns the usd_amount and fx_rate of deposit cash
// flows with a non-null fx_rate, used for the weighted-average investment
// rate.
func (r *PostgresAnalyticsRepository) GetFXImpactCashFlows(ctx context.Context, userID string) ([]models.AnalyticsFXImpactCashFlowRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT cf.usd_amount, cf.fx_rate
		FROM cash_flows cf
		WHERE cf.user_id = $1 
			AND cf.type = 'deposit' 
			AND cf.fx_rate IS NOT NULL
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load fx-impact cash flows: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsFXImpactCashFlowRow, error) {
		var cf models.AnalyticsFXImpactCashFlowRow
		return cf, row.Scan(&cf.USDAmount, &cf.FXRate)
	})
}

// GetLatestFXRate returns the most recent fx_rates.rate for the user, or "" 
// when no rate exists (ErrNoRows).
func (r *PostgresAnalyticsRepository) GetLatestFXRate(ctx context.Context, userID string) (string, error) {
	var rate string
	err := r.pool.QueryRow(ctx, `
		SELECT rate
		FROM fx_rates
		WHERE user_id = $1
		ORDER BY date DESC
		LIMIT 1
	`, userID).Scan(&rate)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", fmt.Errorf("get latest fx rate: %w", err)
	}
	return rate, nil
}

// GetFXRatePeriods returns up to 12 monthly average FX rates (period YYYY-MM
// and rate) ordered by period descending.
func (r *PostgresAnalyticsRepository) GetFXRatePeriods(ctx context.Context, userID string) ([]models.AnalyticsFXRatePeriodRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT 
			TO_CHAR(date, 'YYYY-MM') as period,
			AVG(rate) as avg_rate
		FROM fx_rates
		WHERE user_id = $1
		GROUP BY TO_CHAR(date, 'YYYY-MM')
		ORDER BY period DESC
		LIMIT 12
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load fx rate periods: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsFXRatePeriodRow, error) {
		var p models.AnalyticsFXRatePeriodRow
		return p, row.Scan(&p.Period, &p.Rate)
	})
}

// --- net_worth.go ---------------------------------------------------------

// GetCashFlowsBalance returns COALESCE(SUM(<cash-flow balance case>), 0) for
// the user (deposits minus withdrawals plus cash adjustments minus unlinked
// fees).
func (r *PostgresAnalyticsRepository) GetCashFlowsBalance(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, cashFlowsBalanceSQL(), userID).Scan(&total); err != nil {
		return "", fmt.Errorf("get cash flows balance: %w", err)
	}
	return total, nil
}

// GetNetTradeCashFlow returns COALESCE(SUM(<trade cash-flow case>), 0) for the
// user (non-opening buys minus sells, with fees).
func (r *PostgresAnalyticsRepository) GetNetTradeCashFlow(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, netTradeCashFlowSQL(), userID).Scan(&total); err != nil {
		return "", fmt.Errorf("get net trade cash flow: %w", err)
	}
	return total, nil
}

// GetNetInvested returns COALESCE(SUM(deposits - withdrawals), 0) for the user.
func (r *PostgresAnalyticsRepository) GetNetInvested(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, netInvestedSQL(), userID).Scan(&total); err != nil {
		return "", fmt.Errorf("get net invested: %w", err)
	}
	return total, nil
}

// GetTransferFees returns COALESCE(SUM(usd_amount), 0) for deposit/withdrawal/
// closing fee cash flows for the user.
func (r *PostgresAnalyticsRepository) GetTransferFees(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1
		  AND type = 'fee'
		  AND (
		    related_cash_flow_id IS NOT NULL
		    OR fee_type IN ('deposit', 'withdrawal')
		  )
	`, userID).Scan(&total); err != nil {
		return "", fmt.Errorf("get transfer fees: %w", err)
	}
	return total, nil
}

// GetTradingFees returns COALESCE(SUM(total_fees), 0) across all trades for the
// user.
func (r *PostgresAnalyticsRepository) GetTradingFees(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_fees), 0)
		FROM trades
		WHERE user_id = $1
	`, userID).Scan(&total); err != nil {
		return "", fmt.Errorf("get trading fees: %w", err)
	}
	return total, nil
}

// GetXIRRCashFlows returns deposit/withdrawal cash flows ordered by date
// ascending, used by the XIRR solver.
func (r *PostgresAnalyticsRepository) GetXIRRCashFlows(ctx context.Context, userID string) ([]models.AnalyticsXIRRCashFlowRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, type, usd_amount
		FROM cash_flows
		WHERE user_id = $1 AND type IN ('deposit', 'withdrawal')
		ORDER BY date ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load xirr cash flows: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsXIRRCashFlowRow, error) {
		var cf models.AnalyticsXIRRCashFlowRow
		return cf, row.Scan(&cf.Date, &cf.Type, &cf.USDAmount)
	})
}

// GetLocalCurrencyTotals returns the summed local-currency (config.
// LocalCurrency) deposits and withdrawals for the user.
func (r *PostgresAnalyticsRepository) GetLocalCurrencyTotals(ctx context.Context, userID string) (models.AnalyticsLocalCurrencyTotals, error) {
	query := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(CASE WHEN type = 'deposit' AND currency = '%s' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'withdrawal' AND currency = '%s' THEN amount ELSE 0 END), 0)
		FROM cash_flows WHERE user_id = $1
	`, config.LocalCurrency, config.LocalCurrency)

	var totals models.AnalyticsLocalCurrencyTotals
	if err := r.pool.QueryRow(ctx, query, userID).Scan(&totals.TotalDeposited, &totals.TotalWithdrawn); err != nil {
		return totals, fmt.Errorf("get %s deposits and withdrawals: %w", config.LocalCurrency, err)
	}
	return totals, nil
}

// --- return_attribution.go ------------------------------------------------

// GetReturnAttributionFees returns per-fee-type (deposit/trading/closing/
// total) sums for fee cash flows for the user.
func (r *PostgresAnalyticsRepository) GetReturnAttributionFees(ctx context.Context, userID string) (models.AnalyticsReturnAttributionFeesRow, error) {
	var fees models.AnalyticsReturnAttributionFeesRow
	err := r.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN fee_type = 'deposit' THEN usd_amount ELSE 0 END), 0) as deposit_fees,
			COALESCE(SUM(CASE WHEN fee_type = 'trading' THEN usd_amount ELSE 0 END), 0) as trading_fees,
			COALESCE(SUM(CASE WHEN fee_type = 'closing' THEN usd_amount ELSE 0 END), 0) as closing_fees,
			COALESCE(SUM(usd_amount), 0) as total_fees
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`, userID).Scan(
		&fees.DepositFees,
		&fees.TradingFees,
		&fees.ClosingFees,
		&fees.TotalFees,
	)
	if err != nil {
		return fees, fmt.Errorf("get return attribution fees: %w", err)
	}
	return fees, nil
}

// GetReturnAttributionHoldings returns one row per ticker with positive net
// quantity, its total cost, and current price (from market_prices or the
// latest trade).
func (r *PostgresAnalyticsRepository) GetReturnAttributionHoldings(ctx context.Context, userID string) ([]models.AnalyticsReturnAttributionHoldingRow, error) {
	rows, err := r.pool.Query(ctx, returnAttributionHoldingsSQL(), userID)
	if err != nil {
		return nil, fmt.Errorf("get return attribution holdings: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsReturnAttributionHoldingRow, error) {
		var h models.AnalyticsReturnAttributionHoldingRow
		return h, row.Scan(&h.Ticker, &h.NetQuantity, &h.TotalCost, &h.CurrentPrice)
	})
}

// --- analytics_performance_time_series.go ---------------------------------

// GetPerformanceSnapshots returns portfolio_snapshots for the user ordered by
// snapshot_date ascending.
func (r *PostgresAnalyticsRepository) GetPerformanceSnapshots(ctx context.Context, userID string) ([]models.AnalyticsPerformanceSnapshotRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT 
			snapshot_date,
			total_value_usd,
			total_invested_usd,
			total_fees_usd,
			total_fx_impact_usd
		FROM portfolio_snapshots
		WHERE user_id = $1
		ORDER BY snapshot_date ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get performance snapshots: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsPerformanceSnapshotRow, error) {
		var s models.AnalyticsPerformanceSnapshotRow
		return s, row.Scan(
			&s.SnapshotDate,
			&s.TotalValueUSD,
			&s.TotalInvestedUSD,
			&s.TotalFeesUSD,
			&s.TotalFXImpactUSD,
		)
	})
}

// GetPerformanceActivityCashFlows returns cash_flows for the user ordered by
// date ascending, used to synthesize performance points.
func (r *PostgresAnalyticsRepository) GetPerformanceActivityCashFlows(ctx context.Context, userID string) ([]models.AnalyticsPerformanceCashFlowRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, type, usd_amount, related_trade_id, related_cash_flow_id
		FROM cash_flows
		WHERE user_id = $1
		ORDER BY date ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get performance cash flows: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsPerformanceCashFlowRow, error) {
		var cf models.AnalyticsPerformanceCashFlowRow
		return cf, row.Scan(&cf.Date, &cf.Type, &cf.USDAmount, &cf.RelatedTradeID, &cf.RelatedCashFlowID)
	})
}

// GetPerformanceActivityTrades returns trades for the user ordered by date
// ascending, used to synthesize performance points.
func (r *PostgresAnalyticsRepository) GetPerformanceActivityTrades(ctx context.Context, userID string) ([]models.AnalyticsPerformanceTradeRow, error) {
	rows, err := r.pool.Query(ctx, performanceTradeLoadSQL(), userID)
	if err != nil {
		return nil, fmt.Errorf("get performance trades: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsPerformanceTradeRow, error) {
		var tr models.AnalyticsPerformanceTradeRow
		return tr, row.Scan(
			&tr.Date,
			&tr.Side,
			&tr.Ticker,
			&tr.Quantity,
			&tr.Price,
			&tr.TotalFees,
			&tr.IsOpeningPosition,
		)
	})
}

// --- realized_pl.go -------------------------------------------------------

// GetRealizedPLTrades returns every trade for the user ordered by date then
// created_at ascending, used to compute realized P/L by trade ID.
func (r *PostgresAnalyticsRepository) GetRealizedPLTrades(ctx context.Context, userID string) ([]models.AnalyticsRealizedPLRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, date, created_at, ticker, side, quantity, price, COALESCE(total_fees, 0)
		FROM trades
		WHERE user_id = $1
		ORDER BY date ASC, created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get realized pl trades: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsRealizedPLRow, error) {
		var tr models.AnalyticsRealizedPLRow
		return tr, row.Scan(&tr.ID, &tr.Date, &tr.CreatedAt, &tr.Ticker, &tr.Side, &tr.Quantity, &tr.Price, &tr.TotalFees)
	})
}

// --- spy_benchmark.go -----------------------------------------------------

// GetSPYBenchmarkPrices returns SPY market prices ordered by updated_at
// ascending, used to index the benchmark against the portfolio series.
func (r *PostgresAnalyticsRepository) GetSPYBenchmarkPrices(ctx context.Context) ([]models.AnalyticsSPYPriceRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT updated_at::date, price::text
		FROM market_prices
		WHERE ticker = 'SPY'
		ORDER BY updated_at ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("load spy prices: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.AnalyticsSPYPriceRow, error) {
		var p models.AnalyticsSPYPriceRow
		return p, row.Scan(&p.Date, &p.Price)
	})
}