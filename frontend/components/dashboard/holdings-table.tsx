"use client"

import { useCallback, useMemo } from "react"
import type { Holding } from "@/lib/types"
import Link from "next/link"
import { Plus } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DataTableColumnToggle } from "@/components/ui/data-table-column-toggle"
import { EmptyState } from "@/components/ui/empty-state"
import { TablePagination } from "@/components/ui/table-pagination"
import { usePersistedVisibleColumns } from "@/hooks/use-persisted-visible-columns"
import { formatCurrency, format } from "@/lib/decimal"
import { Decimal } from "@/lib/decimal"
import { RefreshPricesButton } from "@/components/dashboard/refresh-prices-button"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import {
  mergePageSearchParams,
  type PageSize,
} from "@/lib/pagination/table-pagination"

interface HoldingsTableProps {
  holdings: Holding[]
  total: number
  page: number
  pageSize: PageSize
  priceUpdatedAtByTicker?: Record<string, string | null>
  lastPriceRefreshAt?: string | null
  onQuickTrade?: (ticker: string, assetType: string) => void
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

function getPriceAsOf(
  holding: Holding,
  byTicker: Record<string, string | null>,
): string | null {
  return (
    holding.priceAsOf ??
    holding.price_as_of ??
    holding.market_price_updated_at ??
    byTicker[holding.ticker] ??
    null
  )
}

function isStaleTimestamp(value: string | null | undefined): boolean {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return Date.now() - parsed.getTime() > 24 * 60 * 60 * 1000
}

export function HoldingsTable({
  holdings,
  total,
  page,
  pageSize,
  priceUpdatedAtByTicker = {},
  lastPriceRefreshAt = null,
  onQuickTrade,
}: HoldingsTableProps) {
  const safeHoldings = holdings || []

  const hasStalePrices = useMemo(
    () =>
      safeHoldings.some((holding) =>
        isStaleTimestamp(getPriceAsOf(holding, priceUpdatedAtByTicker)),
      ),
    [safeHoldings, priceUpdatedAtByTicker],
  )
  const formattedRefresh = formatPriceAsOf(lastPriceRefreshAt)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const replaceQuery = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      const params = mergePageSearchParams(
        new URLSearchParams(searchParams.toString()),
        nextPage,
        pageSize,
      )
      replaceQuery(params)
    },
    [pageSize, replaceQuery, searchParams],
  )

  const setPageSize = useCallback(
    (nextSize: PageSize) => {
      const params = mergePageSearchParams(
        new URLSearchParams(searchParams.toString()),
        1,
        nextSize,
      )
      replaceQuery(params)
    },
    [replaceQuery, searchParams],
  )

  const columns = useMemo<DataTableColumn<Holding>[]>(
    () => [
      {
        key: "ticker",
        header: "Ticker",
        cell: (holding) => (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/trades?ticker=${encodeURIComponent(holding.ticker)}`}
              className="hover:underline font-mono font-semibold"
            >
              {holding.ticker}
            </Link>
            {onQuickTrade && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onQuickTrade(holding.ticker, holding.assetType ?? "stock")}
                aria-label={`Quick buy ${holding.ticker}`}
                title={`Add buy for ${holding.ticker}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
      {
        key: "quantity",
        header: "Quantity",
        cell: (holding) => format(holding.quantity, 4),
        align: "right",
        className: "font-mono",
      },
      {
        key: "avgCost",
        header: "Avg Cost",
        cell: (holding) => formatCurrency(holding.avgCost, MARKET_CONFIG.baseCurrency),
        align: "right",
        className: "font-mono",
      },
      {
        key: "totalInvested",
        header: "Total Invested",
        cell: (holding) => formatCurrency(holding.totalInvested, MARKET_CONFIG.baseCurrency),
        align: "right",
        className: "font-mono",
      },
      {
        key: "marketValue",
        header: "Market Value",
        cell: (holding) => formatCurrency(holding.marketValue, MARKET_CONFIG.baseCurrency),
        align: "right",
        className: "font-mono font-semibold",
      },
      {
        key: "unrealizedPL",
        header: "Unrealized P/L",
        cell: (holding) => {
          const pl = new Decimal(holding.unrealizedPL || 0)
          const isPositive = pl.gte(0)
          return (
            <span className={isPositive ? "text-primary" : "text-destructive"}>
              {formatCurrency(holding.unrealizedPL, MARKET_CONFIG.baseCurrency)}
            </span>
          )
        },
        align: "right",
        className: "font-mono",
      },
      {
        key: "unrealizedPLPercent",
        header: "P/L %",
        cell: (holding) => {
          const pl = new Decimal(holding.unrealizedPL || 0)
          const isPositive = pl.gte(0)
          return (
            <span className={isPositive ? "text-primary" : "text-destructive"}>
              {format(holding.unrealizedPLPercent, 2)}%
            </span>
          )
        },
        align: "right",
        className: "font-mono",
      },
    ],
    [onQuickTrade],
  )

  const { visibleColumns, visibleKeys, defaultKeys, setVisibleKeys } =
    usePersistedVisibleColumns("holdings-table-columns", columns)

  if (safeHoldings.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Current Holdings</h2>
          <RefreshPricesButton />
        </div>
        <EmptyState
          title="No holdings yet"
          description="Add trades to build your portfolio, then use Refresh Prices to load market values."
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Current Holdings</h2>
        <div className="flex items-center gap-2">
          <RefreshPricesButton />
          <DataTableColumnToggle
            columns={columns}
            visibleKeys={visibleKeys}
            defaultVisibleKeys={defaultKeys}
            onChange={setVisibleKeys}
          />
        </div>
      </div>

      {formattedRefresh && (
        <p className="text-xs text-muted-foreground">Prices as of {formattedRefresh}</p>
      )}
      {hasStalePrices && (
        <p className="text-sm text-destructive">
          Some prices are stale (&gt;24h). Use Refresh Prices to sync market values.
        </p>
      )}

      <DataTable
        data={safeHoldings}
        columns={visibleColumns}
        keyExtractor={(holding) => holding.ticker}
        rowClassName="group"
      />

      {total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </section>
  )
}
