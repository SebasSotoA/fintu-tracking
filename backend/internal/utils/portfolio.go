package utils

import (
	"fintu-tracking-backend/internal/models"
	"sort"

	"github.com/shopspring/decimal"
)

// CalculateHoldings calculates current holdings from trade history
func CalculateHoldings(trades []models.Trade) map[string]models.Holding {
	holdings := make(map[string]models.Holding)

	// Group trades by ticker
	tradesByTicker := make(map[string][]models.Trade)
	for _, trade := range trades {
		tradesByTicker[trade.Ticker] = append(tradesByTicker[trade.Ticker], trade)
	}

	// Calculate holdings for each ticker
	for ticker, tickerTrades := range tradesByTicker {
		// Sort by date ascending
		sort.Slice(tickerTrades, func(i, j int) bool {
			return tickerTrades[i].Date.Before(tickerTrades[j].Date)
		})

		totalQuantity := decimal.Zero
		totalCost := decimal.Zero

		for _, trade := range tickerTrades {
			quantity, _ := decimal.NewFromString(trade.Quantity)
			total, _ := decimal.NewFromString(trade.Total)

			if trade.Side == "buy" {
				totalQuantity = totalQuantity.Add(quantity)
				totalCost = totalCost.Add(total)
			} else {
				// Sell - reduce quantity and cost proportionally
				if totalQuantity.GreaterThan(decimal.Zero) {
					avgCost := totalCost.Div(totalQuantity)
					totalQuantity = totalQuantity.Sub(quantity)
					totalCost = totalQuantity.Mul(avgCost)
				}
			}
		}

		// Only include if we still hold shares
		if totalQuantity.GreaterThan(decimal.Zero) {
			avgCost := totalCost.Div(totalQuantity)
			holdings[ticker] = models.Holding{
				Ticker:              ticker,
				Quantity:            totalQuantity.String(),
				AvgCost:             avgCost.String(),
				TotalInvested:       totalCost.String(),
				MarketValue:         "0",
				UnrealizedPL:        "0",
				UnrealizedPLPercent: "0",
			}
		}
	}

	return holdings
}

// UpdateHoldingsWithPrices updates holdings with current market prices
func UpdateHoldingsWithPrices(holdings map[string]models.Holding, prices map[string]string) map[string]models.Holding {
	updatedHoldings := make(map[string]models.Holding)

	for ticker, holding := range holdings {
		if priceStr, ok := prices[ticker]; ok {
			quantity, _ := decimal.NewFromString(holding.Quantity)
			price, _ := decimal.NewFromString(priceStr)
			totalInvested, _ := decimal.NewFromString(holding.TotalInvested)

			marketValue := quantity.Mul(price)
			unrealizedPL := marketValue.Sub(totalInvested)
			unrealizedPLPercent := unrealizedPL.Div(totalInvested).Mul(decimal.NewFromInt(100))

			updatedHoldings[ticker] = models.Holding{
				Ticker:              ticker,
				Quantity:            holding.Quantity,
				AvgCost:             holding.AvgCost,
				TotalInvested:       holding.TotalInvested,
				MarketValue:         marketValue.String(),
				UnrealizedPL:        unrealizedPL.String(),
				UnrealizedPLPercent: unrealizedPLPercent.String(),
			}
		} else {
			updatedHoldings[ticker] = holding
		}
	}

	return updatedHoldings
}

