import type { Trade, Holding } from "./types"
import { Decimal } from "./decimal"

/**
 * Calculates current holdings from trade history
 * Matches the backend logic in backend/internal/utils/portfolio.go
 */
export function calculateHoldings(trades: Trade[]): Map<string, Holding> {
  const holdings = new Map<string, Holding>()

  // Group trades by ticker
  const tradesByTicker = new Map<string, Trade[]>()
  for (const trade of trades) {
    const existing = tradesByTicker.get(trade.ticker) || []
    tradesByTicker.set(trade.ticker, [...existing, trade])
  }

  // Calculate holdings for each ticker
  for (const [ticker, tickerTrades] of tradesByTicker.entries()) {
    // Sort by date ascending
    const sortedTrades = [...tickerTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let totalQuantity = new Decimal(0)
    let totalCost = new Decimal(0)

    for (const trade of sortedTrades) {
      const quantity = new Decimal(trade.quantity)
      const total = new Decimal(trade.total)

      if (trade.side === "buy") {
        totalQuantity = totalQuantity.add(quantity)
        totalCost = totalCost.add(total)
      } else {
        // Sell - reduce quantity and cost proportionally
        if (totalQuantity.gt(0)) {
          const avgCost = totalCost.div(totalQuantity)
          totalQuantity = totalQuantity.sub(quantity)
          totalCost = totalQuantity.mul(avgCost)
        }
      }
    }

    // Only include if we still hold shares
    if (totalQuantity.gt(0)) {
      const avgCost = totalCost.div(totalQuantity)
      holdings.set(ticker, {
        ticker,
        quantity: totalQuantity.toString(),
        avgCost: avgCost.toString(),
        totalInvested: totalCost.toString(),
        marketValue: "0",
        unrealizedPL: "0",
        unrealizedPLPercent: "0",
      })
    }
  }

  return holdings
}

/**
 * Updates holdings with current market prices
 * Matches the backend logic in backend/internal/utils/portfolio.go
 */
export function updateHoldingsWithPrices(
  holdings: Map<string, Holding>,
  prices: Map<string, string>,
): Map<string, Holding> {
  const updatedHoldings = new Map<string, Holding>()

  for (const [ticker, holding] of holdings.entries()) {
    const priceStr = prices.get(ticker)
    if (priceStr) {
      const quantity = new Decimal(holding.quantity)
      const price = new Decimal(priceStr)
      const totalInvested = new Decimal(holding.totalInvested)

      const marketValue = quantity.mul(price)
      const unrealizedPL = marketValue.sub(totalInvested)
      const unrealizedPLPercent = totalInvested.gt(0) ? unrealizedPL.div(totalInvested).mul(100) : new Decimal(0)

      updatedHoldings.set(ticker, {
        ticker,
        quantity: holding.quantity,
        avgCost: holding.avgCost,
        totalInvested: holding.totalInvested,
        marketValue: marketValue.toString(),
        unrealizedPL: unrealizedPL.toString(),
        unrealizedPLPercent: unrealizedPLPercent.toString(),
      })
    } else {
      updatedHoldings.set(ticker, holding)
    }
  }

  return updatedHoldings
}

