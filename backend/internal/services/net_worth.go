package services

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

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
		XIRR:              "0",
		TotalDepositedCOP: "0",
		TotalWithdrawnCOP: "0",
		Breakdown: models.NetWorthBreakdown{
			ByAssetType: make(map[string]string),
			ByTicker:    make(map[string]string),
			TopHoldings: []models.Holding{},
		},
	}

	rows, err := s.pool.Query(ctx, netWorthHoldingsSQL(), userID)
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

			if val, exists := summary.Breakdown.ByAssetType[assetType]; exists {
				current, _ := decimal.NewFromString(val)
				summary.Breakdown.ByAssetType[assetType] = current.Add(marketValue).String()
			} else {
				summary.Breakdown.ByAssetType[assetType] = marketValue.String()
			}

			summary.Breakdown.ByTicker[ticker] = marketValue.String()
		}
	}

	summary.HoldingsValue = totalHoldingsValue.String()

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

	summary.CashBalance = cash.String()
	netWorth := portfolioNetWorth(totalHoldingsValue, cash)
	summary.NetWorth = netWorth.String()

	var totalInvested string
	s.pool.QueryRow(ctx, netInvestedSQL(), userID).Scan(&totalInvested)
	summary.TotalInvested = totalInvested

	var allFees string
	s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1 AND type = 'fee'
	`, userID).Scan(&allFees)
	summary.TotalFees = allFees

	invested, _ := decimal.NewFromString(totalInvested)
	gainLoss := netWorth.Sub(invested)
	summary.TotalGainLoss = gainLoss.String()

	if !invested.IsZero() {
		gainLossPct := gainLoss.Div(invested).Mul(decimal.NewFromInt(100))
		summary.TotalGainLossPct = gainLossPct.String()
	}

	xirrRate, err := calculateXIRR(ctx, s.pool, userID, netWorth, time.Now())
	if err == nil && !xirrRate.IsZero() {
		summary.XIRR = xirrRate.Mul(decimal.NewFromInt(100)).StringFixed(2)
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN type = 'deposit' AND currency = 'COP' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'withdrawal' AND currency = 'COP' THEN amount ELSE 0 END), 0)
		FROM cash_flows WHERE user_id = $1
	`, userID).Scan(&summary.TotalDepositedCOP, &summary.TotalWithdrawnCOP); err != nil {
		return summary, fmt.Errorf("failed to sum COP deposits and withdrawals: %w", err)
	}

	return summary, nil
}
