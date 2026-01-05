"use client"

import type { Holding, CashFlow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Decimal } from "@/lib/decimal"
import { formatCurrency } from "@/lib/decimal"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PortfolioSummaryProps {
  holdings: Holding[]
  cashFlows: CashFlow[]
  latestFxRate: string | null
}

export function PortfolioSummary({ holdings, cashFlows, latestFxRate }: PortfolioSummaryProps) {
  // Ensure arrays are valid
  const safeHoldings = holdings || []
  const safeCashFlows = cashFlows || []

  // Calculate total portfolio value in USD
  const totalMarketValueUSD = safeHoldings.reduce(
    (sum, holding) => sum.add(new Decimal(holding.marketValue || 0)),
    new Decimal(0),
  )

  // Calculate total invested from cash flows
  const deposits = safeCashFlows
    .filter((cf) => cf.type === "deposit")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  const withdrawals = safeCashFlows
    .filter((cf) => cf.type === "withdrawal")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  const fees = safeCashFlows
    .filter((cf) => cf.type === "fee")
    .reduce((sum, cf) => sum.add(new Decimal(cf.usd_amount)), new Decimal(0))

  const netInvestedUSD = deposits.sub(withdrawals)
  const totalPL = totalMarketValueUSD.sub(netInvestedUSD)
  const totalPLPercent = netInvestedUSD.gt(0) ? totalPL.div(netInvestedUSD).mul(100) : new Decimal(0)

  // Convert to COP if FX rate available
  const fxRate = latestFxRate ? new Decimal(latestFxRate) : null
  const totalMarketValueCOP = fxRate ? totalMarketValueUSD.mul(fxRate) : null
  const totalPLCOP = fxRate ? totalPL.mul(fxRate) : null

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">{formatCurrency(totalMarketValueUSD.toString(), "USD")}</div>
          {totalMarketValueCOP && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(totalMarketValueCOP.toString(), "COP")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">{formatCurrency(netInvestedUSD.toString(), "USD")}</div>
          <p className="text-sm text-muted-foreground mt-1">Deposits: {formatCurrency(deposits.toString(), "USD")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total P/L (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold font-mono ${totalPL.gte(0) ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(totalPL.toString(), "USD")}
            </div>
            {totalPL.gte(0) ? (
              <TrendingUp className="h-5 w-5 text-primary" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
          </div>
          <p className={`text-sm mt-1 ${totalPL.gte(0) ? "text-primary" : "text-destructive"}`}>
            {totalPLPercent.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">{formatCurrency(fees.toString(), "USD")}</div>
          {fxRate && <p className="text-sm text-muted-foreground mt-1">Rate: {fxRate.toFixed(2)} COP/USD</p>}
        </CardContent>
      </Card>
    </div>
  )
}
