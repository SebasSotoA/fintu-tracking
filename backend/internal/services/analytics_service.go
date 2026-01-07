package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

// AnalyticsService handles performance attribution and analysis
type AnalyticsService struct {
	pool *pgxpool.Pool
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(pool *pgxpool.Pool) *AnalyticsService {
	return &AnalyticsService{pool: pool}
}

// CalculateReturnAttribution decomposes portfolio returns into components
func (s *AnalyticsService) CalculateReturnAttribution(ctx context.Context, userID string) (models.ReturnAttribution, error) {
	attribution := models.ReturnAttribution{
		StartingCapital:     "0",
		MarketGains:         "0",
		MarketGainsPct:      "0",
		DepositFeesImpact:   "0",
		TradingFeesImpact:   "0",
		ClosingFeesImpact:   "0",
		TotalFeesImpact:     "0",
		TotalFeesImpactPct:  "0",
		FXImpact:            "0",
		FXImpactPct:         "0",
		NetPosition:         "0",
		NetReturnPct:        "0",
	}

	// Calculate total invested (deposits - withdrawals, excluding fees)
	var totalDeposits, totalWithdrawals string
	err := s.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'deposit' THEN usd_amount ELSE 0 END), 0) as deposits,
			COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN usd_amount ELSE 0 END), 0) as withdrawals
		FROM cash_flows
		WHERE user_id = $1
	`, userID).Scan(&totalDeposits, &totalWithdrawals)
	if err != nil {
		return attribution, fmt.Errorf("failed to calculate total invested: %w", err)
	}

	deposits, _ := decimal.NewFromString(totalDeposits)
	withdrawals, _ := decimal.NewFromString(totalWithdrawals)
	startingCapital := deposits.Sub(withdrawals)
	attribution.StartingCapital = startingCapital.String()

	// Calculate fees by type
	err = s.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN fee_type = 'deposit' THEN usd_amount ELSE 0 END), 0) as deposit_fees,
			COALESCE(SUM(CASE WHEN fee_type = 'trading' THEN usd_amount ELSE 0 END), 0) as trading_fees,
			COALESCE(SUM(CASE WHEN fee_type = 'closing' THEN usd_amount ELSE 0 END), 0) as closing_fees,
			COALESCE(SUM(usd_amount), 0) as total_fees
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`, userID).Scan(
		&attribution.DepositFeesImpact,
		&attribution.TradingFeesImpact,
		&attribution.ClosingFeesImpact,
		&attribution.TotalFeesImpact,
	)
	if err != nil {
		return attribution, fmt.Errorf("failed to calculate fee impact: %w", err)
	}

	totalFees, _ := decimal.NewFromString(attribution.TotalFeesImpact)

	// Calculate current portfolio value and holdings
	// Use market price if available, otherwise fall back to most recent trade price
	rows, err := s.pool.Query(ctx, `
		SELECT 
			t.ticker,
			SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) as net_quantity,
			SUM(CASE WHEN t.side = 'buy' THEN (t.quantity * t.price + COALESCE(t.fee, 0)) ELSE 0 END) as total_cost,
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
	`, userID)
	if err != nil {
		return attribution, fmt.Errorf("failed to query holdings: %w", err)
	}
	defer rows.Close()

	totalValue := decimal.Zero
	totalCost := decimal.Zero

	for rows.Next() {
		var ticker string
		var netQuantity, costBasis, currentPrice *string

		if err := rows.Scan(&ticker, &netQuantity, &costBasis, &currentPrice); err != nil {
			continue
		}

		if netQuantity != nil && costBasis != nil {
			qty, _ := decimal.NewFromString(*netQuantity)
			cost, _ := decimal.NewFromString(*costBasis)
			totalCost = totalCost.Add(cost)

			if currentPrice != nil && qty.GreaterThan(decimal.Zero) {
				price, _ := decimal.NewFromString(*currentPrice)
				value := qty.Mul(price)
				totalValue = totalValue.Add(value)
			}
		}
	}

	// Calculate available cash
	var availableCash string
	err = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE 
				WHEN type = 'deposit' THEN usd_amount
				WHEN type = 'withdrawal' THEN -usd_amount
				WHEN type = 'fee' THEN -usd_amount
				ELSE 0
			END
		), 0)
		FROM cash_flows
		WHERE user_id = $1
	`, userID).Scan(&availableCash)
	if err != nil {
		availableCash = "0"
	}

	cash, _ := decimal.NewFromString(availableCash)
	
	// Calculate net position (holdings + cash)
	netPosition := totalValue.Add(cash)
	attribution.NetPosition = netPosition.String()

	// Calculate market gains (current value - cost basis)
	marketGains := totalValue.Sub(totalCost)
	attribution.MarketGains = marketGains.String()

	// Calculate market gains percentage
	if !totalCost.IsZero() {
		marketGainsPct := marketGains.Div(totalCost).Mul(decimal.NewFromInt(100))
		attribution.MarketGainsPct = marketGainsPct.String()
	}

	// Calculate fee impact percentage
	if !startingCapital.IsZero() {
		feeImpactPct := totalFees.Div(startingCapital).Mul(decimal.NewFromInt(100))
		attribution.TotalFeesImpactPct = feeImpactPct.String()
	}

	// Calculate net return (net position - starting capital)
	netReturn := netPosition.Sub(startingCapital)
	if !startingCapital.IsZero() {
		netReturnPct := netReturn.Div(startingCapital).Mul(decimal.NewFromInt(100))
		attribution.NetReturnPct = netReturnPct.String()
	}

	// FX impact calculation (placeholder - would need more complex logic)
	// For now, we'll calculate as difference between net return and market gains - fees
	fxImpact := netReturn.Sub(marketGains).Add(totalFees)
	attribution.FXImpact = fxImpact.String()
	
	if !startingCapital.IsZero() {
		fxImpactPct := fxImpact.Div(startingCapital).Mul(decimal.NewFromInt(100))
		attribution.FXImpactPct = fxImpactPct.String()
	}

	return attribution, nil
}

// CalculateFXImpact analyzes the impact of exchange rate changes
func (s *AnalyticsService) CalculateFXImpact(ctx context.Context, userID string) (models.FXImpactReport, error) {
	report := models.FXImpactReport{
		AvgInvestmentRate: "0",
		CurrentRate:       "0",
		RateChangePct:     "0",
		FXImpactUSD:       "0",
		FXImpactPct:       "0",
		ImpactByPeriod:    make(map[string]string),
	}

	// Get weighted average FX rate at time of investments
	var avgRate string
	err := s.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(
				SUM(cf.usd_amount * cf.fx_rate) / NULLIF(SUM(cf.usd_amount), 0),
				0
			) as weighted_avg_rate
		FROM cash_flows cf
		WHERE cf.user_id = $1 
			AND cf.type = 'deposit' 
			AND cf.fx_rate IS NOT NULL
	`, userID).Scan(&avgRate)
	if err != nil {
		avgRate = "0"
	}
	report.AvgInvestmentRate = avgRate

	// Get current/latest FX rate
	var currentRate string
	err = s.pool.QueryRow(ctx, `
		SELECT rate
		FROM fx_rates
		WHERE user_id = $1
		ORDER BY date DESC
		LIMIT 1
	`, userID).Scan(&currentRate)
	if err != nil {
		if err != nil && err.Error() == "no rows in result set" {
			currentRate = avgRate // Use average if no current rate
		} else {
			return report, fmt.Errorf("failed to get current FX rate: %w", err)
		}
	}
	report.CurrentRate = currentRate

	// Calculate rate change percentage
	avg, _ := decimal.NewFromString(avgRate)
	current, _ := decimal.NewFromString(currentRate)
	
	if !avg.IsZero() {
		rateChange := current.Sub(avg).Div(avg).Mul(decimal.NewFromInt(100))
		report.RateChangePct = rateChange.String()
	}

	// Calculate FX impact in USD (simplified - actual calculation would be more complex)
	// This would require tracking original COP amounts and converting at different rates
	// For now, we'll provide a placeholder
	report.FXImpactUSD = "0"
	report.FXImpactPct = "0"

	// Impact by period (monthly breakdown)
	periodRows, err := s.pool.Query(ctx, `
		SELECT 
			TO_CHAR(date, 'YYYY-MM') as period,
			AVG(rate) as avg_rate
		FROM fx_rates
		WHERE user_id = $1
		GROUP BY TO_CHAR(date, 'YYYY-MM')
		ORDER BY period DESC
		LIMIT 12
	`, userID)
	if err == nil {
		defer periodRows.Close()
		for periodRows.Next() {
			var period, rate string
			if err := periodRows.Scan(&period, &rate); err == nil {
				report.ImpactByPeriod[period] = rate
			}
		}
	}

	return report, nil
}

// GetPerformanceTimeSeries returns portfolio performance over time
func (s *AnalyticsService) GetPerformanceTimeSeries(ctx context.Context, userID, interval string) ([]models.PerformancePoint, error) {
	// Validate interval
	if interval != "day" && interval != "week" && interval != "month" && interval != "year" {
		interval = "day"
	}

	// Use portfolio snapshots if available, otherwise calculate on the fly
	query := `
		SELECT 
			snapshot_date,
			total_value_usd,
			total_invested_usd,
			total_fees_usd,
			total_fx_impact_usd
		FROM portfolio_snapshots
		WHERE user_id = $1
		ORDER BY snapshot_date ASC
	`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query performance time series: %w", err)
	}
	defer rows.Close()

	var points []models.PerformancePoint
	for rows.Next() {
		var point models.PerformancePoint
		var totalValue, invested, fees, fxImpact string

		err := rows.Scan(
			&point.Date,
			&totalValue,
			&invested,
			&fees,
			&fxImpact,
		)
		if err != nil {
			continue
		}

		point.PortfolioValue = totalValue
		point.InvestedCapital = invested
		point.CumulativeFees = fees
		point.CumulativeFXImpact = fxImpact

		// Calculate net return
		value, _ := decimal.NewFromString(totalValue)
		investedDec, _ := decimal.NewFromString(invested)
		netReturn := value.Sub(investedDec)
		point.NetReturn = netReturn.String()

		// Calculate net return percentage
		if !investedDec.IsZero() {
			netReturnPct := netReturn.Div(investedDec).Mul(decimal.NewFromInt(100))
			point.NetReturnPct = netReturnPct.String()
		} else {
			point.NetReturnPct = "0"
		}

		points = append(points, point)
	}

	// If no snapshots, generate from transaction history
	if len(points) == 0 {
		points, err = s.generatePerformancePoints(ctx, userID, interval)
		if err != nil {
			return nil, fmt.Errorf("failed to generate performance points: %w", err)
		}
	}

	return points, nil
}

// generatePerformancePoints creates performance timeline from transaction history
func (s *AnalyticsService) generatePerformancePoints(ctx context.Context, userID, interval string) ([]models.PerformancePoint, error) {
	// Get all relevant dates (trades and cash flows)
	query := `
		SELECT DISTINCT date
		FROM (
			SELECT date FROM trades WHERE user_id = $1
			UNION
			SELECT date FROM cash_flows WHERE user_id = $1
		) dates
		ORDER BY date ASC
	`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var date time.Time
		if err := rows.Scan(&date); err == nil {
			dates = append(dates, date)
		}
	}

	// For each date, calculate portfolio state
	// This is simplified - in production would use more efficient calculations
	points := []models.PerformancePoint{}
	
	for _, date := range dates {
		point := models.PerformancePoint{
			Date:              date,
			PortfolioValue:    "0",
			InvestedCapital:   "0",
			CumulativeFees:    "0",
			CumulativeFXImpact: "0",
			NetReturn:         "0",
			NetReturnPct:      "0",
		}

		// Calculate invested capital up to this date
		var invested string
		s.pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(
				CASE 
					WHEN type = 'deposit' THEN usd_amount
					WHEN type = 'withdrawal' THEN -usd_amount
					ELSE 0
				END
			), 0)
			FROM cash_flows
			WHERE user_id = $1 AND date <= $2
		`, userID, date).Scan(&invested)
		point.InvestedCapital = invested

		// Calculate cumulative fees
		var fees string
		s.pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(usd_amount), 0)
			FROM cash_flows
			WHERE user_id = $1 AND type = 'fee' AND date <= $2
		`, userID, date).Scan(&fees)
		point.CumulativeFees = fees

		// Portfolio value would require market prices at each date
		// For now, simplified calculation
		point.PortfolioValue = invested

		points = append(points, point)
	}

	return points, nil
}

// GetNetWorthSummary provides complete financial position
func (s *AnalyticsService) GetNetWorthSummary(ctx context.Context, userID string) (models.NetWorthSummary, error) {
	summary := models.NetWorthSummary{
		HoldingsValue:    "0",
		CashBalance:      "0",
		NetWorth:         "0",
		TotalInvested:    "0",
		TotalFees:        "0",
		TotalGainLoss:    "0",
		TotalGainLossPct: "0",
		XIRR:             "0",
		Breakdown: models.NetWorthBreakdown{
			ByAssetType: make(map[string]string),
			ByTicker:    make(map[string]string),
			ByBroker:    make(map[string]string),
			TopHoldings: []models.Holding{},
		},
	}

	// Calculate holdings value
	// Use market price if available, otherwise fall back to most recent trade price
	rows, err := s.pool.Query(ctx, `
		SELECT 
			t.ticker,
			t.asset_type,
			SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END) as net_quantity,
			SUM(CASE WHEN t.side = 'buy' THEN (t.quantity * t.price + COALESCE(t.fee, 0)) ELSE -(t.quantity * t.price - COALESCE(t.fee, 0)) END) as cost_basis,
			SUM(CASE WHEN t.side = 'buy' THEN COALESCE(t.fee, 0) ELSE 0 END) as total_fees,
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
	`, userID)
	if err != nil {
		return summary, fmt.Errorf("failed to calculate holdings: %w", err)
	}
	defer rows.Close()

	totalHoldingsValue := decimal.Zero
	totalCostBasis := decimal.Zero
	totalFees := decimal.Zero

	for rows.Next() {
		var ticker, assetType string
		var netQty, costBasis, fees, currentPrice *string

		if err := rows.Scan(&ticker, &assetType, &netQty, &costBasis, &fees, &currentPrice); err != nil {
			continue
		}

		if netQty != nil && costBasis != nil {
			qty, _ := decimal.NewFromString(*netQty)
			cost, _ := decimal.NewFromString(*costBasis)
			fee, _ := decimal.NewFromString(*fees)
			
			totalCostBasis = totalCostBasis.Add(cost)
			totalFees = totalFees.Add(fee)

			var marketValue decimal.Decimal
			if currentPrice != nil {
				price, _ := decimal.NewFromString(*currentPrice)
				marketValue = qty.Mul(price)
				totalHoldingsValue = totalHoldingsValue.Add(marketValue)
			}

			// Add to breakdown by asset type
			if val, exists := summary.Breakdown.ByAssetType[assetType]; exists {
				current, _ := decimal.NewFromString(val)
				summary.Breakdown.ByAssetType[assetType] = current.Add(marketValue).String()
			} else {
				summary.Breakdown.ByAssetType[assetType] = marketValue.String()
			}

			// Add to breakdown by ticker
			summary.Breakdown.ByTicker[ticker] = marketValue.String()
		}
	}

	summary.HoldingsValue = totalHoldingsValue.String()

	// Calculate cash balance
	var cashBalance string
	err = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE 
				WHEN type = 'deposit' THEN usd_amount
				WHEN type = 'withdrawal' THEN -usd_amount
				WHEN type = 'fee' THEN -usd_amount
				ELSE 0
			END
		), 0)
		FROM cash_flows
		WHERE user_id = $1
	`, userID).Scan(&cashBalance)
	if err != nil {
		cashBalance = "0"
	}

	cash, _ := decimal.NewFromString(cashBalance)
	
	// Subtract trade costs from cash
	var tradeCosts string
	s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE 
				WHEN side = 'buy' THEN (quantity * price + COALESCE(fee, 0))
				WHEN side = 'sell' THEN -(quantity * price - COALESCE(fee, 0))
				ELSE 0
			END
		), 0)
		FROM trades
		WHERE user_id = $1
	`, userID).Scan(&tradeCosts)
	
	costs, _ := decimal.NewFromString(tradeCosts)
	cash = cash.Sub(costs)
	
	summary.CashBalance = cash.String()

	// Calculate net worth (holdings + cash)
	netWorth := totalHoldingsValue.Add(cash)
	summary.NetWorth = netWorth.String()

	// Calculate total invested
	var totalInvested string
	s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(
			CASE 
				WHEN type = 'deposit' THEN usd_amount
				WHEN type = 'withdrawal' THEN -usd_amount
				ELSE 0
			END
		), 0)
		FROM cash_flows
		WHERE user_id = $1
	`, userID).Scan(&totalInvested)
	summary.TotalInvested = totalInvested

	// Get total fees
	var allFees string
	s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`, userID).Scan(&allFees)
	summary.TotalFees = allFees

	// Calculate gain/loss
	invested, _ := decimal.NewFromString(totalInvested)
	gainLoss := netWorth.Sub(invested)
	summary.TotalGainLoss = gainLoss.String()

	if !invested.IsZero() {
		gainLossPct := gainLoss.Div(invested).Mul(decimal.NewFromInt(100))
		summary.TotalGainLossPct = gainLossPct.String()
	}

	return summary, nil
}

