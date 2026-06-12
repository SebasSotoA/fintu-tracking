"use client"

import type { Holding } from "@/lib/types"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, format } from "@/lib/decimal"
import { Decimal } from "@/lib/decimal"
import { RefreshPricesButton } from "@/components/dashboard/refresh-prices-button"

interface HoldingsTableProps {
  holdings: Holding[]
  priceUpdatedAtByTicker?: Record<string, string | null>
  lastPriceRefreshAt?: string | null
}

function formatPriceAsOf(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isStaleTimestamp(value: string | null | undefined): boolean {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return Date.now() - parsed.getTime() > 24 * 60 * 60 * 1000
}

export function HoldingsTable({
  holdings,
  priceUpdatedAtByTicker = {},
  lastPriceRefreshAt = null,
}: HoldingsTableProps) {
  const safeHoldings = holdings || []

  if (safeHoldings.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Current Holdings</CardTitle>
          <RefreshPricesButton />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-2">No holdings yet</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            Add trades to build your portfolio, then use Refresh Prices to load market values.
          </p>
        </CardContent>
      </Card>
    )
  }

  const sortedHoldings = [...safeHoldings].sort((a, b) => {
    const aValue = new Decimal(a.marketValue || 0)
    const bValue = new Decimal(b.marketValue || 0)
    return bValue.comparedTo(aValue)
  })
  const hasStalePrices = sortedHoldings.some((holding) =>
    isStaleTimestamp(
      holding.priceAsOf ??
        holding.price_as_of ??
        holding.market_price_updated_at ??
        priceUpdatedAtByTicker[holding.ticker] ??
        null,
    ),
  )
  const formattedRefresh = formatPriceAsOf(lastPriceRefreshAt)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Current Holdings</CardTitle>
        <RefreshPricesButton />
      </CardHeader>
      <CardContent>
        {formattedRefresh && (
          <p className="mb-3 text-xs text-muted-foreground">Prices as of {formattedRefresh}</p>
        )}
        {hasStalePrices && (
          <p className="mb-3 text-sm text-destructive">
            Some prices are stale (&gt;24h). Use Refresh Prices to sync market values.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Total Invested</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Price as of</TableHead>
              <TableHead className="text-right">Unrealized P/L</TableHead>
              <TableHead className="text-right">P/L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHoldings.map((holding) => {
              const pl = new Decimal(holding.unrealizedPL || 0)
              const isPositive = pl.gte(0)
              const priceAsOf =
                holding.priceAsOf ??
                holding.price_as_of ??
                holding.market_price_updated_at ??
                priceUpdatedAtByTicker[holding.ticker] ??
                null

              return (
                <TableRow key={holding.ticker}>
                  <TableCell className="font-mono font-semibold">
                    <Link
                      href={`/trades?ticker=${encodeURIComponent(holding.ticker)}`}
                      className="hover:underline"
                    >
                      {holding.ticker}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">{format(holding.quantity, 4)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(holding.avgCost, "USD")}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(holding.totalInvested, "USD")}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(holding.marketValue, "USD")}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatPriceAsOf(priceAsOf) ?? "—"}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${isPositive ? "text-primary" : "text-destructive"}`}>
                    {formatCurrency(holding.unrealizedPL, "USD")}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${isPositive ? "text-primary" : "text-destructive"}`}>
                    {format(holding.unrealizedPLPercent, 2)}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
