package services

import (
	"context"
	"fmt"

	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

// CalculateReturnAttribution decomposes portfolio returns into components
func (s *AnalyticsService) CalculateReturnAttribution(ctx context.Context, userID string) (models.ReturnAttribution, error) {
	attribution := models.ReturnAttribution{
		StartingCapital:    "0",
		MarketGains:        "0",
		MarketGainsPct:     "0",
		DepositFeesImpact:  "0",
		TradingFeesImpact:  "0",
		ClosingFeesImpact:  "0",
		TotalFeesImpact:    "0",
		TotalFeesImpactPct: "0",
		FXImpact:           "0",
		FXImpactPct:        "0",
		NetPosition:        "0",
		NetReturnPct:       "0",
	}

	var startingCapitalStr string
	err := s.pool.QueryRow(ctx, netInvestedSQL(), userID).Scan(&startingCapitalStr)
	if err != nil {
		return attribution, fmt.Errorf("failed to calculate total invested: %w", err)
	}

	startingCapital, err := decimal.NewFromString(startingCapitalStr)
	if err != nil {
		return attribution, fmt.Errorf("parse starting capital: %w", err)
	}
	attribution.StartingCapital = startingCapital.String()

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

	rows, err := s.pool.Query(ctx, returnAttributionHoldingsSQL(), userID)
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

	var cashFlowsBalance string
	err = s.pool.QueryRow(ctx, cashFlowsBalanceSQL(), userID).Scan(&cashFlowsBalance)
	if err != nil {
		cashFlowsBalance = "0"
	}

	var tradeCosts string
	if err := s.pool.QueryRow(ctx, netTradeCashFlowSQL(), userID).Scan(&tradeCosts); err != nil {
		tradeCosts = "0"
	}

	cashFromFlows, _ := decimal.NewFromString(cashFlowsBalance)
	costs, _ := decimal.NewFromString(tradeCosts)
	cash := portfolioCashAfterTrades(cashFromFlows, costs)

	netPosition := portfolioNetWorth(totalValue, cash)
	attribution.NetPosition = netPosition.String()

	marketGains := totalValue.Sub(totalCost)
	attribution.MarketGains = marketGains.String()

	if !totalCost.IsZero() {
		marketGainsPct := marketGains.Div(totalCost).Mul(decimal.NewFromInt(100))
		attribution.MarketGainsPct = marketGainsPct.String()
	}

	if !startingCapital.IsZero() {
		feeImpactPct := totalFees.Div(startingCapital).Mul(decimal.NewFromInt(100))
		attribution.TotalFeesImpactPct = feeImpactPct.String()
	}

	netReturn := netPosition.Sub(startingCapital)
	if !startingCapital.IsZero() {
		netReturnPct := netReturn.Div(startingCapital).Mul(decimal.NewFromInt(100))
		attribution.NetReturnPct = netReturnPct.String()
	}

	return attribution, nil
}
