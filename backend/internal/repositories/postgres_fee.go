package repositories

import (
	"context"
	"fmt"
	"time"

	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresFeeRepository implements services.FeeRepository against Postgres.
type PostgresFeeRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresFeeRepository returns a FeeRepository backed by the given pool.
func NewPostgresFeeRepository(pool *pgxpool.Pool) *PostgresFeeRepository {
	return &PostgresFeeRepository{pool: pool}
}

// feesByTypeSQL returns the base query for aggregating fee cash flows by type.
func feesByTypeSQL() string {
	return `
		SELECT
			COALESCE(fee_type, 'other') as fee_type,
			SUM(usd_amount) as total
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`
}

func feesByMonthSQL() string {
	return `
		SELECT
			to_char(date_trunc('month', date), 'YYYY-MM') as month_key,
			SUM(usd_amount) as total
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`
}

func reconcileOrphanedCashFlowsSQL() string {
	return `
		SELECT id FROM orphaned_fee_cash_flows WHERE user_id = $1
	`
}

func reconcileDiscrepanciesSQL() string {
	return `
		SELECT trade_id, ticker, date, trade_total_fees, cash_flow_total_fees, reconciliation_diff
		FROM fee_reconciliation_summary
		WHERE user_id = $1 AND reconciliation_diff <> 0
	`
}

// appendCashFlowFeeDateRange appends optional start/end date predicates to the
// fee cash-flow query, incrementing the placeholder counter accordingly.
func appendCashFlowFeeDateRange(query string, args []interface{}, argCount int, startDate, endDate *time.Time) (string, []interface{}, int) {
	if startDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date >= $%d", argCount)
		args = append(args, *startDate)
	}
	if endDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date <= $%d", argCount)
		args = append(args, *endDate)
	}
	return query, args, argCount
}

// GetFeesByType returns one row per fee_type with its summed USD amount for fee
// cash flows in the optional date range.
func (r *PostgresFeeRepository) GetFeesByType(ctx context.Context, userID string, startDate, endDate *time.Time) ([]models.FeeTypeTotal, error) {
	query := feesByTypeSQL()
	args := []interface{}{userID}
	query, args, _ = appendCashFlowFeeDateRange(query, args, 1, startDate, endDate)
	query += " GROUP BY fee_type"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying fees by type: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.FeeTypeTotal, error) {
		var t models.FeeTypeTotal
		return t, row.Scan(&t.FeeType, &t.Total)
	})
}

// GetFeesByMonth returns one row per month with its summed USD amount for fee
// cash flows in the optional date range, ordered by month ascending.
func (r *PostgresFeeRepository) GetFeesByMonth(ctx context.Context, userID string, startDate, endDate *time.Time) ([]models.FeeMonthTotal, error) {
	query := feesByMonthSQL()
	args := []interface{}{userID}
	query, args, _ = appendCashFlowFeeDateRange(query, args, 1, startDate, endDate)
	query += " GROUP BY date_trunc('month', date) ORDER BY date_trunc('month', date)"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying fees by month: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.FeeMonthTotal, error) {
		var m models.FeeMonthTotal
		return m, row.Scan(&m.MonthKey, &m.Total)
	})
}

// GetTradeFeeImpact returns aggregated trade stats for a ticker, or nil,nil
// when the user has no trades for that ticker.
func (r *PostgresFeeRepository) GetTradeFeeImpact(ctx context.Context, userID, ticker string) (*models.TradeFeeImpact, error) {
	query := `
		SELECT
			SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) as net_quantity,
			SUM(CASE WHEN side = 'buy' THEN (quantity * price) ELSE 0 END) as total_cost,
			SUM(COALESCE(total_fees, 0)) as total_fees,
			COUNT(*) as trade_count
		FROM trades
		WHERE user_id = $1 AND ticker = $2
		GROUP BY ticker
	`

	var impact models.TradeFeeImpact
	err := r.pool.QueryRow(ctx, query, userID, ticker).Scan(
		&impact.NetQuantity, &impact.TotalCost, &impact.TotalFees, &impact.TradeCount)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("querying trade fee impact: %w", err)
	}
	return &impact, nil
}

// GetTotalTradeFees returns COALESCE(SUM(total_fees), 0) across all trades for
// the user.
func (r *PostgresFeeRepository) GetTotalTradeFees(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_fees), 0)
		FROM trades
		WHERE user_id = $1
	`, userID).Scan(&total); err != nil {
		return "", fmt.Errorf("querying total trade fees: %w", err)
	}
	return total, nil
}

// GetTotalCashFlowFees returns COALESCE(SUM(usd_amount), 0) for trade-related
// fee cash flows for the user.
func (r *PostgresFeeRepository) GetTotalCashFlowFees(ctx context.Context, userID string) (string, error) {
	var total string
	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee' AND related_type = 'trade'
	`, userID).Scan(&total); err != nil {
		return "", fmt.Errorf("querying total cash flow fees: %w", err)
	}
	return total, nil
}

// GetMissingLinks returns trade IDs that have positive total_fees but no
// matching fee cash flow.
func (r *PostgresFeeRepository) GetMissingLinks(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id
		FROM trades t
		WHERE t.user_id = $1
		  AND t.total_fees > 0
		  AND NOT EXISTS (
			SELECT 1 FROM cash_flows cf
			WHERE cf.related_trade_id = t.id
			  AND cf.type = 'fee'
			  AND cf.related_type = 'trade'
		  )
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("querying missing links: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, pgx.RowTo[string])
}

// GetOrphanedFeeCashFlows returns fee cash-flow IDs whose related trade no
// longer exists (from the orphaned_fee_cash_flows view).
func (r *PostgresFeeRepository) GetOrphanedFeeCashFlows(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, reconcileOrphanedCashFlowsSQL(), userID)
	if err != nil {
		return nil, fmt.Errorf("querying orphaned fee cash flows: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, pgx.RowTo[string])
}

// GetUnlinkedFeeCashFlows returns trade-fee cash-flow IDs whose related_trade_id
// is NULL.
func (r *PostgresFeeRepository) GetUnlinkedFeeCashFlows(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT cf.id
		FROM cash_flows cf
		WHERE cf.user_id = $1
		  AND cf.type = 'fee'
		  AND cf.related_type = 'trade'
		  AND cf.related_trade_id IS NULL
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("querying unlinked fee cash flows: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, pgx.RowTo[string])
}

// GetReconciliationSummary returns rows from fee_reconciliation_summary where
// reconciliation_diff is non-zero.
func (r *PostgresFeeRepository) GetReconciliationSummary(ctx context.Context, userID string) ([]models.ReconciliationSummaryRow, error) {
	rows, err := r.pool.Query(ctx, reconcileDiscrepanciesSQL(), userID)
	if err != nil {
		return nil, fmt.Errorf("querying reconciliation summary: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.ReconciliationSummaryRow, error) {
		var s models.ReconciliationSummaryRow
		return s, row.Scan(
			&s.TradeID, &s.Ticker, &s.Date,
			&s.TradeTotalFees, &s.CashFlowTotalFees, &s.ReconciliationDiff)
	})
}

// GetFeeEfficiencyByTicker returns per-ticker fee efficiency rows ordered by
// total fees descending.
func (r *PostgresFeeRepository) GetFeeEfficiencyByTicker(ctx context.Context, userID string) ([]models.FeeEfficiencyRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			ticker,
			COUNT(*) as trade_count,
			SUM(COALESCE(total_fees, 0)) as total_fees,
			SUM(quantity * price) as total_value,
			AVG(COALESCE(total_fees, 0) / NULLIF(quantity * price, 0) * 100) as avg_fee_pct
		FROM trades
		WHERE user_id = $1 AND COALESCE(total_fees, 0) > 0
		GROUP BY ticker
		ORDER BY SUM(COALESCE(total_fees, 0)) DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("querying fee efficiency: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.FeeEfficiencyRow, error) {
		var e models.FeeEfficiencyRow
		return e, row.Scan(&e.Ticker, &e.TradeCount, &e.TotalFees, &e.TotalValue, &e.AvgFeePct)
	})
}