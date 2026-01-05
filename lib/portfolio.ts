import { Decimal } from "./decimal"
import type { Trade, Holding } from "./types"

export function calculateHoldings(trades: Trade[]): Map<string, Holding> {
  const holdings = new Map<string, Holding>()

  // Group trades by ticker
  const tradesByTicker = trades.reduce(
    (acc, trade) => {
      if (!acc[trade.ticker]) {
        acc[trade.ticker] = []
      }
      acc[trade.ticker].push(trade)
      return acc
    },
    {} as Record<string, Trade[]>,
  )

  // Calculate holdings for each ticker
  for (const [ticker, tickerTrades] of Object.entries(tradesByTicker)) {
    // Sort by date ascending
    const sortedTrades = tickerTrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

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

export function updateHoldingsWithPrices(
  holdings: Map<string, Holding>,
  prices: Map<string, string>,
): Map<string, Holding> {
  const updatedHoldings = new Map<string, Holding>()

  for (const [ticker, holding] of holdings) {
    const price = prices.get(ticker)
    if (price) {
      const quantity = new Decimal(holding.quantity)
      const avgCost = new Decimal(holding.avgCost)
      const marketValue = quantity.mul(price)
      const totalInvested = new Decimal(holding.totalInvested)
      const unrealizedPL = marketValue.sub(totalInvested)
      const unrealizedPLPercent = unrealizedPL.div(totalInvested).mul(100)

      updatedHoldings.set(ticker, {
        ...holding,
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
