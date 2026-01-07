"use client"

import type { Trade, CashFlow, FxRate, MarketPrice } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Decimal } from "@/lib/decimal"
import { formatCurrency } from "@/lib/decimal"
import { calculateXIRR } from "@/lib/xirr"
import { calculateHoldings, updateHoldingsWithPrices } from "@/lib/portfolio"

interface PerformanceMetricsProps {
  trades: Trade[]
  cashFlows: CashFlow[]
  fxRates: FxRate[]
  marketPrices: MarketPrice[]
}

export function PerformanceMetrics({ trades, cashFlows, fxRates, marketPrices }: PerformanceMetricsProps) {
  // Ensure all arrays are valid
  const safeTrades = trades || []
  const safeCashFlows = cashFlows || []
  const safeFxRates = fxRates || []
  const safeMarketPrices = marketPrices || []

  // Calculate portfolio value
  const holdings = calculateHoldings(safeTrades)
  const pricesMap = new Map(safeMarketPrices.map((p) => [p.ticker, p.price]))
  const holdingsWithPrices = updateHoldingsWithPrices(holdings, pricesMap)

  const portfolioValueUSD = Array.from(holdingsWithPrices.values()).reduce(
    (sum, h) => sum.add(new Decimal(h.marketValue || 0)),
    new Decimal(0),
  )

  // Calculate cash flow totals
  const deposits = safeCashFlows
    .filter((cf) => cf.type === "deposit")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  const withdrawals = safeCashFlows
    .filter((cf) => cf.type === "withdrawal")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  const totalFees = safeCashFlows
    .filter((cf) => cf.type === "fee")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  // Calculate trade fees
  const tradeFees = safeTrades.reduce((sum, t) => sum.add(new Decimal(t.fee || 0)), new Decimal(0))

  const totalFeesUSD = totalFees.add(tradeFees)

  // Calculate XIRR
  const xirrCashFlows = [
    ...safeCashFlows
      .filter((cf) => cf.type === "deposit" || cf.type === "withdrawal")
      .map((cf) => ({
        date: new Date(cf.date),
        amount: new Decimal(cf.usd_amount).mul(cf.type === "deposit" ? -1 : 1),
      })),
    {
      date: new Date(),
      amount: portfolioValueUSD,
    },
  ]

  const xirrUSD = calculateXIRR(xirrCashFlows)

  // Calculate with COP
  const latestFxRate = safeFxRates.length > 0 ? new Decimal(safeFxRates[0].rate) : null

  const depositsInCOP = safeCashFlows
    .filter((cf) => cf.type === "deposit")
    .reduce((sum, cf) => {
      if (cf.currency === "COP") {
        return sum.add(new Decimal(cf.amount))
      } else {
        const rate = latestFxRate || new Decimal(1)
        return sum.add(new Decimal(cf.amount).mul(rate))
      }
    }, new Decimal(0))

  const portfolioValueCOP = latestFxRate ? portfolioValueUSD.mul(latestFxRate) : null

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card variant="kpi">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">XIRR (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl md:text-4xl font-bold font-mono tracking-tight ${new Decimal(xirrUSD).gte(0) ? "text-primary" : "text-destructive"}`}
          >
            {new Decimal(xirrUSD).toFixed(2)}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">Annualized return</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Invested</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-semibold font-mono">{formatCurrency(deposits.toString(), "USD")}</div>
          {depositsInCOP && (
            <p className="text-sm text-muted-foreground mt-2">{formatCurrency(depositsInCOP.toString(), "COP")}</p>
          )}
        </CardContent>
      </Card>

      <Card variant="kpi">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold font-mono tracking-tight">{formatCurrency(portfolioValueUSD.toString(), "USD")}</div>
          {portfolioValueCOP && (
            <p className="text-sm text-muted-foreground mt-2">{formatCurrency(portfolioValueCOP.toString(), "COP")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-semibold font-mono text-destructive">
            {formatCurrency(totalFeesUSD.toString(), "USD")}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Trading: {formatCurrency(tradeFees.toString(), "USD")}</p>
        </CardContent>
      </Card>
    </div>
  )
}
