package services

import (
	"context"
	"fmt"
	"time"

	"fintu-tracking-backend/internal/models"
	"github.com/shopspring/decimal"
)

// GetNetWorthSummary provides complete financial position
func (s *AnalyticsService) GetNetWorthSummary(ctx context.Context, userID string) (models.NetWorthSummary, error) {
	summary := models.NetWorthSummary{
		HoldingsValue:     "0",
		CashBalance:       "0",
		NetWorth:          "0",
		TotalInvested:     "0",
		TotalFees:         "0",
		TotalGainLoss:     "0",
		TotalGainLossPct:  "0",
		XIRR:              "0",
		TotalDepositedCOP: "0",
		TotalWithdrawnCOP: "0",
		Breakdown: models.NetWorthBreakdown{
			ByAssetType: make(map[string]string),
			ByTicker:    make(map[string]string),
			TopHoldings: []models.Holding{},
		},
	}

	holdings, err := s.GetCurrentHoldings(ctx, userID)
	if err != nil {
		return summary, fmt.Errorf("failed to load holdings: %w", err)
	}

	totalHoldingsValue := decimal.Zero

	for _, holding := range holdings {
		marketValue, err := decimal.NewFromString(holding.MarketValue)
		if err != nil {
			continue
		}
		totalHoldingsValue = totalHoldingsValue.Add(marketValue)

		if val, exists := summary.Breakdown.ByAssetType[holding.AssetType]; exists {
			current, _ := decimal.NewFromString(val)
			summary.Breakdown.ByAssetType[holding.AssetType] = current.Add(marketValue).String()
		} else {
			summary.Breakdown.ByAssetType[holding.AssetType] = marketValue.String()
		}

		summary.Breakdown.ByTicker[holding.Ticker] = marketValue.String()
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

	var transferFees string
	s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(usd_amount), 0)
		FROM cash_flows
		WHERE user_id = $1
		  AND type = 'fee'
		  AND (
		    related_cash_flow_id IS NOT NULL
		    OR fee_type IN ('deposit', 'withdrawal')
		  )
	`, userID).Scan(&transferFees)

	var tradeFees string
	s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_fees), 0)
		FROM trades
		WHERE user_id = $1
	`, userID).Scan(&tradeFees)

	transferFeesDec, _ := decimal.NewFromString(transferFees)
	tradeFeesDec, _ := decimal.NewFromString(tradeFees)
	summary.TotalFees = transferFeesDec.Add(tradeFeesDec).String()

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
