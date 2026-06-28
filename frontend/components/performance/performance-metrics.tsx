"use client"

import type { Trade, CashFlow, FxRate, MarketPrice, NetWorthData } from "@/lib/types"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Decimal } from "@/lib/decimal"
import { formatCurrency } from "@/lib/decimal"
import { calculateXIRR } from "@/lib/xirr"
import { calculateHoldings, updateHoldingsWithPrices } from "@/lib/portfolio"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"

interface PerformanceMetricsProps {
  trades: Trade[]
  cashFlows: CashFlow[]
  fxRates: FxRate[]
  marketPrices: MarketPrice[]
}

export function PerformanceMetrics({ trades, cashFlows, fxRates, marketPrices }: PerformanceMetricsProps) {
  const { data: netWorth, isPending: isNetWorthPending } = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => api.get<NetWorthData>("/api/analytics/net-worth"),
    staleTime: 60_000,
  })

  const safeTrades = trades || []
  const safeCashFlows = cashFlows || []
  const safeFxRates = fxRates || []
  const safeMarketPrices = marketPrices || []

  // Calculate portfolio value
  const holdings = calculateHoldings(safeTrades)
  const pricesMap = new Map(safeMarketPrices.map((p) => [p.ticker, p.price]))
  const holdingsWithPrices = updateHoldingsWithPrices(holdings, pricesMap)

  const portfolioValueBase = Array.from(holdingsWithPrices.values()).reduce(
    (sum, h) => sum.add(new Decimal(h.marketValue || 0)),
    new Decimal(0),
  )

  const totalInvestedBase = new Decimal(netWorth?.total_invested ?? "0")

  const totalFees = safeCashFlows
    .filter((cf) => cf.type === "fee")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  // Calculate trade fees
  const tradeFees = safeTrades.reduce((sum, t) => sum.add(new Decimal(t.total_fees || 0)), new Decimal(0))

  const totalFeesBase = totalFees.add(tradeFees)

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
      amount: portfolioValueBase,
    },
  ]

  const xirrBase = calculateXIRR(xirrCashFlows)

  // Calculate with local currency
  const latestFxRate = safeFxRates.length > 0 ? new Decimal(safeFxRates[0].rate) : null

  const depositsInLocal = safeCashFlows
    .filter((cf) => cf.type === "deposit")
    .reduce((sum, cf) => {
      if (cf.currency === MARKET_CONFIG.localCurrency) {
        return sum.add(new Decimal(cf.amount))
      } else {
        const rate = latestFxRate || new Decimal(1)
        return sum.add(new Decimal(cf.amount).mul(rate))
      }
    }, new Decimal(0))

  const portfolioValueLocal = latestFxRate ? portfolioValueBase.mul(latestFxRate) : null

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card variant="kpi">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">XIRR ({MARKET_CONFIG.baseCurrency})</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl md:text-4xl font-bold font-mono tracking-tight ${new Decimal(xirrBase).gte(0) ? "text-primary" : "text-destructive"}`}
          >
            {new Decimal(xirrBase).toFixed(2)}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">Annualized return</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Invested</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-semibold font-mono">
            {isNetWorthPending
              ? "—"
              : formatCurrency(totalInvestedBase.toString(), MARKET_CONFIG.baseCurrency)}
          </div>
          {depositsInLocal && (
            <p className="text-sm text-muted-foreground mt-2">{formatCurrency(depositsInLocal.toString(), MARKET_CONFIG.localCurrency)}</p>
          )}
        </CardContent>
      </Card>

      <Card variant="kpi">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold font-mono tracking-tight">{formatCurrency(portfolioValueBase.toString(), MARKET_CONFIG.baseCurrency)}</div>
          {portfolioValueLocal && (
            <p className="text-sm text-muted-foreground mt-2">{formatCurrency(portfolioValueLocal.toString(), MARKET_CONFIG.localCurrency)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-semibold font-mono text-destructive">
            {formatCurrency(totalFeesBase.toString(), MARKET_CONFIG.baseCurrency)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Trading: {formatCurrency(tradeFees.toString(), MARKET_CONFIG.baseCurrency)}</p>
        </CardContent>
      </Card>
    </div>
  )
}
