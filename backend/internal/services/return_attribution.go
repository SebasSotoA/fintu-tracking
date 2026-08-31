package services

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"
	"github.com/shopspring/decimal"
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

	startingCapitalStr, err := s.repo.GetNetInvested(ctx, userID)
	if err != nil {
		return attribution, fmt.Errorf("failed to calculate total invested: %w", err)
	}

	startingCapital, err := decimal.NewFromString(startingCapitalStr)
	if err != nil {
		return attribution, fmt.Errorf("parse starting capital: %w", err)
	}
	attribution.StartingCapital = startingCapital.String()

	transferFees, err := s.repo.GetTransferFees(ctx, userID)
	if err != nil {
		return attribution, fmt.Errorf("failed to calculate transfer fees: %w", err)
	}
	tradingFees, err := s.repo.GetTradingFees(ctx, userID)
	if err != nil {
		return attribution, fmt.Errorf("failed to calculate trading fees: %w", err)
	}

	transferDec, parseErr := decimal.NewFromString(transferFees)
	if parseErr != nil {
		transferDec = decimal.Zero
	}
	tradingDec, parseErr := decimal.NewFromString(tradingFees)
	if parseErr != nil {
		tradingDec = decimal.Zero
	}
	totalFees := transferDec.Add(tradingDec)
	attribution.DepositFeesImpact = transferDec.String()
	attribution.TradingFeesImpact = tradingDec.String()
	attribution.TotalFeesImpact = totalFees.String()

	holdingRows, err := s.repo.GetReturnAttributionHoldings(ctx, userID)
	if err != nil {
		return attribution, fmt.Errorf("failed to query holdings: %w", err)
	}

	totalValue, totalCost := sumReturnAttributionHoldings(holdingRows)

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

// sumReturnAttributionHoldings folds the joined holdings rows into total
// market value and total cost. Rows with null quantity/cost are skipped; rows
// with null price contribute cost but no value (consistent with the prior
// scan-and-continue behavior).
func sumReturnAttributionHoldings(rows []models.AnalyticsReturnAttributionHoldingRow) (totalValue, totalCost decimal.Decimal) {
	for _, row := range rows {
		if row.NetQuantity == nil || row.TotalCost == nil {
			continue
		}
		qty, err := decimal.NewFromString(*row.NetQuantity)
		if err != nil {
			continue
		}
		cost, err := decimal.NewFromString(*row.TotalCost)
		if err != nil {
			continue
		}
		totalCost = totalCost.Add(cost)

		if row.CurrentPrice != nil && qty.GreaterThan(decimal.Zero) {
			price, err := decimal.NewFromString(*row.CurrentPrice)
			if err != nil {
				continue
			}
			totalValue = totalValue.Add(qty.Mul(price))
		}
	}
	return totalValue, totalCost
}
