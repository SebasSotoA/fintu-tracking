package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

// FeeService handles fee attribution, reconciliation, and analysis
type FeeService struct {
	pool *pgxpool.Pool
}

// NewFeeService creates a new fee service
func NewFeeService(pool *pgxpool.Pool) *FeeService {
	return &FeeService{pool: pool}
}

// DateRange represents a time period for analysis
type DateRange struct {
	StartDate *time.Time
	EndDate   *time.Time
}

// GetTotalFeesByType returns aggregate fees broken down by type
func (s *FeeService) GetTotalFeesByType(ctx context.Context, userID string, dateRange *DateRange) (models.FeeBreakdown, error) {
	query := `
		SELECT 
			COALESCE(fee_type, 'other') as fee_type,
			SUM(usd_amount) as total
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`

	args := []interface{}{userID}
	argCount := 1
	query, args, argCount = appendCashFlowFeeDateRange(query, args, argCount, dateRange)

	query += " GROUP BY fee_type"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return models.FeeBreakdown{}, fmt.Errorf("failed to query fees by type: %w", err)
	}
	defer rows.Close()

	breakdown := models.FeeBreakdown{
		DepositFees:     "0",
		TradingFees:     "0",
		ClosingFees:     "0",
		MaintenanceFees: "0",
		OtherFees:       "0",
		TotalFees:       "0",
		FeesByMonth:     make(map[string]string),
	}

	totalFees := decimal.Zero

	for rows.Next() {
		var feeType, amount string
		if err := rows.Scan(&feeType, &amount); err != nil {
			return breakdown, fmt.Errorf("failed to scan fee breakdown: %w", err)
		}

		amt, _ := decimal.NewFromString(amount)
		totalFees = totalFees.Add(amt)

		switch feeType {
		case "deposit":
			breakdown.DepositFees = amount
		case "trading":
			breakdown.TradingFees = amount
		case "closing":
			breakdown.ClosingFees = amount
		case "maintenance":
			breakdown.MaintenanceFees = amount
		default:
			breakdown.OtherFees = amount
		}
	}

	breakdown.TotalFees = totalFees.String()

	if err := s.populateFeesByMonth(ctx, userID, dateRange, &breakdown); err != nil {
		return breakdown, err
	}

	return breakdown, rows.Err()
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

func appendCashFlowFeeDateRange(query string, args []interface{}, argCount int, dateRange *DateRange) (string, []interface{}, int) {
	if dateRange == nil {
		return query, args, argCount
	}
	if dateRange.StartDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date >= $%d", argCount)
		args = append(args, *dateRange.StartDate)
	}
	if dateRange.EndDate != nil {
		argCount++
		query += fmt.Sprintf(" AND date <= $%d", argCount)
		args = append(args, *dateRange.EndDate)
	}
	return query, args, argCount
}

func (s *FeeService) populateFeesByMonth(ctx context.Context, userID string, dateRange *DateRange, breakdown *models.FeeBreakdown) error {
	monthQuery := feesByMonthSQL()
	monthArgs := []interface{}{userID}
	monthQuery, monthArgs, _ = appendCashFlowFeeDateRange(monthQuery, monthArgs, 1, dateRange)
	monthQuery += " GROUP BY date_trunc('month', date) ORDER BY date_trunc('month', date)"

	monthRows, err := s.pool.Query(ctx, monthQuery, monthArgs...)
	if err != nil {
		return fmt.Errorf("failed to query fees by month: %w", err)
	}
	defer monthRows.Close()

	for monthRows.Next() {
		var monthKey, amount string
		if err := monthRows.Scan(&monthKey, &amount); err != nil {
			return fmt.Errorf("failed to scan fees by month: %w", err)
		}
		breakdown.FeesByMonth[monthKey] = amount
	}

	return monthRows.Err()
}

// GetFeeImpactOnReturn calculates how fees affected returns for a specific ticker
func (s *FeeService) GetFeeImpactOnReturn(ctx context.Context, userID, ticker string) (map[string]string, error) {
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

	var netQty, totalCost, totalFees string
	var tradeCount int

	err := s.pool.QueryRow(ctx, query, userID, ticker).Scan(&netQty, &totalCost, &totalFees, &tradeCount)
	if err != nil {
		if err != nil && err.Error() == "no rows in result set" {
			return map[string]string{
				"total_fees":       "0",
				"total_cost":       "0",
				"fee_impact_pct":   "0",
				"trade_count":      "0",
			}, nil
		}
		return nil, fmt.Errorf("failed to calculate fee impact: %w", err)
	}

	cost, _ := decimal.NewFromString(totalCost)
	fees, _ := decimal.NewFromString(totalFees)
	
	feeImpactPct := "0"
	if !cost.IsZero() {
		feeImpactPct = fees.Div(cost).Mul(decimal.NewFromInt(100)).String()
	}

	return map[string]string{
		"total_fees":     totalFees,
		"total_cost":     totalCost,
		"fee_impact_pct": feeImpactPct,
		"trade_count":    fmt.Sprintf("%d", tradeCount),
		"net_quantity":   netQty,
	}, nil
}

// ReconcileCashFlowFees checks that all trade fees have corresponding cash flows
func (s *FeeService) ReconcileCashFlowFees(ctx context.Context, userID string) (models.ReconciliationReport, error) {
	report := models.ReconciliationReport{
		IsReconciled:      true,
		MissingLinks:      []string{},
		OrphanedCashFlows: []string{},
		UnlinkedCashFlows: []string{},
		Discrepancies:     []models.ReconciliationIssue{},
	}

	// Get total fees from trades (dual-track: deposit + trading + closing via total_fees)
	var totalTradeFees string
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_fees), 0)
		FROM trades
		WHERE user_id = $1
	`, userID).Scan(&totalTradeFees)
	if err != nil {
		return report, fmt.Errorf("failed to get total trade fees: %w", err)
	}
	report.TotalTradeFees = totalTradeFees

	// Get total fees from cash flows (only trade-related)
	var totalCashFlowFees string
	err = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee' AND related_type = 'trade'
	`, userID).Scan(&totalCashFlowFees)
	if err != nil {
		return report, fmt.Errorf("failed to get total cash flow fees: %w", err)
	}
	report.TotalCashFlowFees = totalCashFlowFees

	// Calculate difference
	tradeFees, _ := decimal.NewFromString(totalTradeFees)
	cashFees, _ := decimal.NewFromString(totalCashFlowFees)
	difference := tradeFees.Sub(cashFees)
	report.Difference = difference.String()

	// Check for trades with fees but no cash flows
	missingRows, err := s.pool.Query(ctx, `
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
		return report, fmt.Errorf("failed to check missing links: %w", err)
	}
	defer missingRows.Close()

	for missingRows.Next() {
		var tradeID string
		if err := missingRows.Scan(&tradeID); err == nil {
			report.MissingLinks = append(report.MissingLinks, tradeID)
			report.IsReconciled = false
		}
	}

	orphanedRows, err := s.pool.Query(ctx, reconcileOrphanedCashFlowsSQL(), userID)
	if err != nil {
		return report, fmt.Errorf("failed to check orphaned cash flows: %w", err)
	}
	defer orphanedRows.Close()

	for orphanedRows.Next() {
		var cfID string
		if err := orphanedRows.Scan(&cfID); err == nil {
			report.OrphanedCashFlows = append(report.OrphanedCashFlows, cfID)
			report.IsReconciled = false
		}
	}

	// Trade fee cash flows detached from a trade (e.g. after ON DELETE SET NULL)
	unlinkedRows, err := s.pool.Query(ctx, `
		SELECT cf.id
		FROM cash_flows cf
		WHERE cf.user_id = $1
		  AND cf.type = 'fee'
		  AND cf.related_type = 'trade'
		  AND cf.related_trade_id IS NULL
	`, userID)
	if err != nil {
		return report, fmt.Errorf("failed to check unlinked cash flows: %w", err)
	}
	defer unlinkedRows.Close()

	for unlinkedRows.Next() {
		var cfID string
		if err := unlinkedRows.Scan(&cfID); err == nil {
			report.UnlinkedCashFlows = append(report.UnlinkedCashFlows, cfID)
			report.IsReconciled = false
		}
	}

	discRows, err := s.pool.Query(ctx, reconcileDiscrepanciesSQL(), userID)
	if err != nil {
		return report, fmt.Errorf("failed to check discrepancies: %w", err)
	}
	defer discRows.Close()

	for discRows.Next() {
		var issue models.ReconciliationIssue
		var date time.Time
		
		if err := discRows.Scan(&issue.TradeID, &issue.Ticker, &date, &issue.ExpectedFees, &issue.ActualCashFlowFees); err == nil {
			issue.Date = date.Format("2006-01-02")
			
			expected, _ := decimal.NewFromString(issue.ExpectedFees)
			actual, _ := decimal.NewFromString(issue.ActualCashFlowFees)
			diff := expected.Sub(actual)
			issue.Difference = diff.String()
			issue.Description = fmt.Sprintf("Trade fee (%s) doesn't match cash flow fees (%s)", issue.ExpectedFees, issue.ActualCashFlowFees)
			
			report.Discrepancies = append(report.Discrepancies, issue)
			report.IsReconciled = false
		}
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

// GetFeeEfficiency calculates fee efficiency metrics by ticker or period
func (s *FeeService) GetFeeEfficiency(ctx context.Context, userID string, groupBy string) (map[string]interface{}, error) {
	// This is a placeholder for more complex fee efficiency calculations
	// Can be expanded based on specific needs
	
	if groupBy == "ticker" {
		query := `
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
		`

		rows, err := s.pool.Query(ctx, query, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate fee efficiency: %w", err)
		}
		defer rows.Close()

		results := make(map[string]interface{})
		tickers := []map[string]string{}

		for rows.Next() {
			var ticker string
			var tradeCount int
			var totalFees, totalValue, avgFeePct string

			if err := rows.Scan(&ticker, &tradeCount, &totalFees, &totalValue, &avgFeePct); err == nil {
				tickers = append(tickers, map[string]string{
					"ticker":       ticker,
					"trade_count":  fmt.Sprintf("%d", tradeCount),
					"total_fees":   totalFees,
					"total_value":  totalValue,
					"avg_fee_pct":  avgFeePct,
				})
			}
		}

		results["by_ticker"] = tickers
		return results, nil
	}

	return map[string]interface{}{}, nil
}

func reconcileDiscrepanciesSQL() string {
	return `
		SELECT trade_id, ticker, date, trade_total_fees, cash_flow_total_fees, reconciliation_diff
		FROM fee_reconciliation_summary
		WHERE user_id = $1 AND reconciliation_diff <> 0
	`
}

func reconcileOrphanedCashFlowsSQL() string {
	return `
		SELECT id FROM orphaned_fee_cash_flows WHERE user_id = $1
	`
}
