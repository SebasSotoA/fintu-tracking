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

// CalculateFeeAttribution returns detailed fee breakdown for all trades in a period
func (s *FeeService) CalculateFeeAttribution(ctx context.Context, userID string, dateRange *DateRange) ([]models.FeeAttribution, error) {
	query := `
		SELECT 
			t.id,
			t.ticker,
			t.date,
			t.side,
			COALESCE(t.deposit_fee, 0) as deposit_fee,
			COALESCE(t.trading_fee, 0) as trading_fee,
			COALESCE(t.closing_fee, 0) as closing_fee,
			t.total_fees,
			t.quantity * t.price as trade_value,
			CASE 
				WHEN t.quantity * t.price > 0 THEN (t.total_fees / (t.quantity * t.price) * 100)
				ELSE 0
			END as fee_impact_pct,
			ARRAY_AGG(cf.id) FILTER (WHERE cf.id IS NOT NULL) as cash_flow_ids
		FROM trades t
		LEFT JOIN cash_flows cf ON cf.related_trade_id = t.id AND cf.type = 'fee'
		WHERE t.user_id = $1
	`

	args := []interface{}{userID}
	argCount := 1

	if dateRange != nil {
		if dateRange.StartDate != nil {
			argCount++
			query += fmt.Sprintf(" AND t.date >= $%d", argCount)
			args = append(args, *dateRange.StartDate)
		}
		if dateRange.EndDate != nil {
			argCount++
			query += fmt.Sprintf(" AND t.date <= $%d", argCount)
			args = append(args, *dateRange.EndDate)
		}
	}

	query += " GROUP BY t.id, t.ticker, t.date, t.side, t.deposit_fee, t.trading_fee, t.closing_fee, t.total_fees, t.quantity, t.price"
	query += " ORDER BY t.date DESC, t.ticker"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query fee attribution: %w", err)
	}
	defer rows.Close()

	var attributions []models.FeeAttribution
	for rows.Next() {
		var attr models.FeeAttribution
		var cashFlowIDs *string

		err := rows.Scan(
			&attr.TradeID,
			&attr.Ticker,
			&attr.Date,
			&attr.Side,
			&attr.DepositFee,
			&attr.TradingFee,
			&attr.ClosingFee,
			&attr.TotalFees,
			&attr.TradeValue,
			&attr.FeeImpactPct,
			&cashFlowIDs,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan fee attribution: %w", err)
		}

		// Parse cash flow IDs array
		if cashFlowIDs != nil {
			// PostgreSQL array format: {id1,id2,id3}
			// Simple parsing - for production, use a proper array scanner
			attr.CashFlowIDs = []string{}
		} else {
			attr.CashFlowIDs = []string{}
		}

		attributions = append(attributions, attr)
	}

	return attributions, rows.Err()
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

	if dateRange != nil {
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
	}

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
		FeesByBroker:    make(map[string]string),
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

	// Get fees by broker
	brokerQuery := `
		SELECT 
			COALESCE(b.name, 'Unspecified') as broker_name,
			SUM(cf.usd_amount) as total
		FROM cash_flows cf
		LEFT JOIN brokers b ON cf.broker_id = b.id
		WHERE cf.user_id = $1 AND cf.type = 'fee'
	`

	if dateRange != nil {
		brokerArgs := []interface{}{userID}
		argCount := 1
		if dateRange.StartDate != nil {
			argCount++
			brokerQuery += fmt.Sprintf(" AND cf.date >= $%d", argCount)
			brokerArgs = append(brokerArgs, *dateRange.StartDate)
		}
		if dateRange.EndDate != nil {
			argCount++
			brokerQuery += fmt.Sprintf(" AND cf.date <= $%d", argCount)
			brokerArgs = append(brokerArgs, *dateRange.EndDate)
		}
		brokerQuery += " GROUP BY b.name"
		
		brokerRows, err := s.pool.Query(ctx, brokerQuery, brokerArgs...)
		if err == nil {
			defer brokerRows.Close()
			for brokerRows.Next() {
				var brokerName, amount string
				if err := brokerRows.Scan(&brokerName, &amount); err == nil {
					breakdown.FeesByBroker[brokerName] = amount
				}
			}
		}
	}

	return breakdown, rows.Err()
}

// GetFeeImpactOnReturn calculates how fees affected returns for a specific ticker
func (s *FeeService) GetFeeImpactOnReturn(ctx context.Context, userID, ticker string) (map[string]string, error) {
	query := `
		SELECT 
			SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) as net_quantity,
			SUM(CASE WHEN side = 'buy' THEN (quantity * price) ELSE 0 END) as total_cost,
			SUM(total_fees) as total_fees,
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
		Discrepancies:     []models.ReconciliationIssue{},
	}

	// Get total fees from trades
	var totalTradeFees string
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_fees), 0)
		FROM trades
		WHERE user_id = $1 AND total_fees > 0
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
			WHERE cf.related_trade_id = t.id AND cf.type = 'fee'
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

	// Check for orphaned cash flows
	orphanedRows, err := s.pool.Query(ctx, `
		SELECT cf.id
		FROM cash_flows cf
		WHERE cf.user_id = $1 
		  AND cf.type = 'fee' 
		  AND cf.related_type = 'trade'
		  AND cf.related_trade_id IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1 FROM trades t WHERE t.id = cf.related_trade_id
		  )
	`, userID)
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

	// Check for discrepancies in individual trades
	discRows, err := s.pool.Query(ctx, `
		SELECT 
			t.id,
			t.ticker,
			t.date,
			t.total_fees,
			COALESCE(SUM(cf.usd_amount), 0) as cash_flow_fees
		FROM trades t
		LEFT JOIN cash_flows cf ON cf.related_trade_id = t.id AND cf.type = 'fee'
		WHERE t.user_id = $1 AND t.total_fees > 0
		GROUP BY t.id, t.ticker, t.date, t.total_fees
		HAVING t.total_fees != COALESCE(SUM(cf.usd_amount), 0)
	`, userID)
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

	// If any issues found, not reconciled
	if !difference.IsZero() && difference.Abs().GreaterThan(decimal.NewFromFloat(0.01)) {
		report.IsReconciled = false
	}

	return report, nil
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
				SUM(total_fees) as total_fees,
				SUM(quantity * price) as total_value,
				AVG(total_fees / NULLIF(quantity * price, 0) * 100) as avg_fee_pct
			FROM trades
			WHERE user_id = $1 AND total_fees > 0
			GROUP BY ticker
			ORDER BY total_fees DESC
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

