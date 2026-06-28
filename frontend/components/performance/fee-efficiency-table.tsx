"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { getFeeEfficiency, type FeeEfficiencyTickerRow } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/decimal"
import Decimal from "decimal.js"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
type SortKey = "ticker" | "trade_count" | "avg_fee_pct" | "total_fees"
type SortDirection = "asc" | "desc"

function compareRows(a: FeeEfficiencyTickerRow, b: FeeEfficiencyTickerRow, key: SortKey): number {
  if (key === "ticker") {
    return a.ticker.localeCompare(b.ticker)
  }
  const aValue = new Decimal(a[key] || "0")
  const bValue = new Decimal(b[key] || "0")
  return aValue.comparedTo(bValue)
}

function sortRows(
  rows: FeeEfficiencyTickerRow[],
  key: SortKey,
  direction: SortDirection,
): FeeEfficiencyTickerRow[] {
  const sorted = [...rows].sort((a, b) => compareRows(a, b, key))
  return direction === "desc" ? sorted.reverse() : sorted
}

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  className?: string
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = activeKey === sortKey
  const ariaSort = isActive ? (direction === "asc" ? "ascending" : "descending") : "none"

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        aria-sort={ariaSort}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUpIcon className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDownIcon className="h-3 w-3" aria-hidden />
          )
        ) : null}
      </button>
    </TableHead>
  )
}

export function FeeEfficiencyTable() {
  const [sortKey, setSortKey] = useState<SortKey>("avg_fee_pct")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.feeEfficiency("ticker"),
    queryFn: () => getFeeEfficiency("ticker"),
    retry: false,
  })

  const rows = useMemo(
    () => sortRows(data?.by_ticker ?? [], sortKey, sortDirection),
    [data?.by_ticker, sortKey, sortDirection],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection(key === "ticker" ? "asc" : "desc")
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Fee efficiency by ticker
        </CardTitle>
        <CardDescription>Average fee as % of trade notional per ticker.</CardDescription>
        <MetricLabel label="Fee efficiency" tooltip={PERFORMANCE_TOOLTIPS.feeEfficiency} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Ticker"
                sortKey="ticker"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Trades"
                sortKey="trade_count"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Avg fee %"
                sortKey="avg_fee_pct"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Total fees"
                sortKey="total_fees"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ticker} className="hover:bg-muted/30">
                <TableCell className="font-mono font-semibold">{row.ticker}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{row.trade_count}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-destructive">
                  {new Decimal(row.avg_fee_pct || "0").toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(row.total_fees, MARKET_CONFIG.baseCurrency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
