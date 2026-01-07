"use client"

import type { Holding } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, format } from "@/lib/decimal"
import { Decimal } from "@/lib/decimal"

interface HoldingsTableProps {
  holdings: Holding[]
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  // Ensure holdings is a valid array
  const safeHoldings = holdings || []

  if (safeHoldings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No holdings yet</p>
          <p className="text-sm text-muted-foreground">Add trades to start building your portfolio</p>
        </CardContent>
      </Card>
    )
  }

  // Sort by market value descending
  const sortedHoldings = [...safeHoldings].sort((a, b) => {
    const aValue = new Decimal(a.marketValue || 0)
    const bValue = new Decimal(b.marketValue || 0)
    return bValue.comparedTo(aValue)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Current Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Total Invested</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Unrealized P/L</TableHead>
              <TableHead className="text-right">P/L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHoldings.map((holding) => {
              const pl = new Decimal(holding.unrealizedPL || 0)
              const isPositive = pl.gte(0)

              return (
                <TableRow key={holding.ticker}>
                  <TableCell className="font-mono font-semibold">{holding.ticker}</TableCell>
                  <TableCell className="text-right font-mono">{format(holding.quantity, 4)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(holding.avgCost, "USD")}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(holding.totalInvested, "USD")}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(holding.marketValue, "USD")}
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
