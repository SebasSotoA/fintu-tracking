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

	cashFlowsBalance, err := s.repo.GetCashFlowsBalance(ctx, userID)
	if err != nil {
		cashFlowsBalance = "0"
	}

	tradeCosts, err := s.repo.GetNetTradeCashFlow(ctx, userID)
	if err != nil {
		tradeCosts = "0"
	}

	cashFromFlows, _ := decimal.NewFromString(cashFlowsBalance)
	costs, _ := decimal.NewFromString(tradeCosts)
	cash := portfolioCashAfterTrades(cashFromFlows, costs)

	summary.CashBalance = cash.String()
	netWorth := portfolioNetWorth(totalHoldingsValue, cash)
	summary.NetWorth = netWorth.String()

	totalInvested, err := s.repo.GetNetInvested(ctx, userID)
	if err != nil {
		totalInvested = "0"
	}
	summary.TotalInvested = totalInvested

	transferFees, err := s.repo.GetTransferFees(ctx, userID)
	if err != nil {
		transferFees = "0"
	}
	tradeFees, err := s.repo.GetTradingFees(ctx, userID)
	if err != nil {
		tradeFees = "0"
	}

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

	xirrRate, err := s.calculateXIRR(ctx, userID, netWorth, time.Now())
	if err == nil && !xirrRate.IsZero() {
		summary.XIRR = xirrRate.Mul(decimal.NewFromInt(100)).StringFixed(2)
	}

	totals, err := s.repo.GetLocalCurrencyTotals(ctx, userID)
	if err != nil {
		return summary, fmt.Errorf("failed to sum local-currency deposits and withdrawals: %w", err)
	}
	summary.TotalDepositedCOP = totals.TotalDeposited
	summary.TotalWithdrawnCOP = totals.TotalWithdrawn

	return summary, nil
}