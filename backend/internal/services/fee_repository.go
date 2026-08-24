package services

import (
	"context"
	"time"

	"fintu-tracking-backend/internal/models"
)

// FeeRepository abstracts database operations for fee analytics and
// reconciliation. Implementations live in the repositories package; the service
// holds this interface and applies business rules on top of the raw data it
// returns. Repository methods are pure data accessors taking primitive
// parameters — composition, mismatch detection, and report building stay in the
// service.
type FeeRepository interface {
	// GetFeesByType returns one row per fee_type with its summed USD amount for
	// fee cash flows in the optional date range. fee_type is COALESCEd to
	// "other" when NULL.
	GetFeesByType(ctx context.Context, userID string, startDate, endDate *time.Time) ([]models.FeeTypeTotal, error)

	// GetFeesByMonth returns one row per month with its summed USD amount for fee
	// cash flows in the optional date range, ordered by month ascending.
	GetFeesByMonth(ctx context.Context, userID string, startDate, endDate *time.Time) ([]models.FeeMonthTotal, error)

	// GetTradeFeeImpact returns aggregated trade stats for a ticker, or
	// nil,nil when the user has no trades for that ticker.
	GetTradeFeeImpact(ctx context.Context, userID, ticker string) (*models.TradeFeeImpact, error)

	// GetTotalTradeFees returns COALESCE(SUM(total_fees), 0) across all trades
	// for the user.
	GetTotalTradeFees(ctx context.Context, userID string) (string, error)

	// GetTotalCashFlowFees returns COALESCE(SUM(usd_amount), 0) for trade-related
	// fee cash flows for the user.
	GetTotalCashFlowFees(ctx context.Context, userID string) (string, error)

	// GetMissingLinks returns trade IDs that have positive total_fees but no
	// matching fee cash flow.
	GetMissingLinks(ctx context.Context, userID string) ([]string, error)

	// GetOrphanedFeeCashFlows returns fee cash-flow IDs whose related trade no
	// longer exists (from the orphaned_fee_cash_flows view).
	GetOrphanedFeeCashFlows(ctx context.Context, userID string) ([]string, error)

	// GetUnlinkedFeeCashFlows returns trade-fee cash-flow IDs whose
	// related_trade_id is NULL.
	GetUnlinkedFeeCashFlows(ctx context.Context, userID string) ([]string, error)

	// GetReconciliationSummary returns rows from fee_reconciliation_summary where
	// reconciliation_diff is non-zero.
	GetReconciliationSummary(ctx context.Context, userID string) ([]models.ReconciliationSummaryRow, error)

	// GetFeeEfficiencyByTicker returns per-ticker fee efficiency rows ordered by
	// total fees descending.
	GetFeeEfficiencyByTicker(ctx context.Context, userID string) ([]models.FeeEfficiencyRow, error)
}