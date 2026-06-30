"use client"

import type { Trade } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MobileActions } from "@/components/ui/mobile-actions"
import { Label } from "@/components/ui/label"
import { FilterSelect } from "@/components/filters/filter-select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MobileFilterDrawer } from "@/components/ui/mobile-filter-drawer"
import { Check, ChevronsUpDown, Download, Pencil, Trash2 } from "lucide-react"
import { Decimal, formatCurrency, format } from "@/lib/decimal"
import { formatCalendarDate } from "@/lib/date-utils"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { EditTradeDialog } from "./edit-trade-dialog"
import { DeleteTradeDialog } from "./delete-trade-dialog"
import { TradeDateFilter } from "@/components/trades/trade-date-filter"
import { invalidateAfterTradeMutation } from "@/lib/api/query-keys"
import { listTradesForExport } from "@/lib/api/trades"
import { downloadTradesCsv } from "@/lib/trades/export-trades-csv"
import {
  DEFAULT_TRADE_FILTERS,
  hasActiveFilters,
  parseTradeFiltersFromSearchParams,
  tradeFiltersToApiParams,
  tradeFiltersToSearchParams,
  type TradeAssetTypeFilter,
  type TradeFilters,
  type TradeSideFilter,
} from "@/lib/trades/trade-filters"
import { TablePagination } from "@/components/ui/table-pagination"
import {
  mergePageSearchParams,
  type PageSize,
} from "@/lib/pagination/table-pagination"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DataTableColumnToggle } from "@/components/ui/data-table-column-toggle"
import { EmptyState } from "@/components/ui/empty-state"
import { usePersistedVisibleColumns } from "@/hooks/use-persisted-visible-columns"

interface TradesListProps {
  trades: Trade[]
  total: number
  page: number
  pageSize: PageSize
  tickers: string[]
}

const SIDE_OPTIONS: { value: TradeSideFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
]

const ASSET_OPTIONS: { value: TradeAssetTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
]

function TradeTickerFilter({
  tickers,
  value,
  onChange,
}: {
  tickers: string[]
  value: string | null
  onChange: (ticker: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const label = value ?? "All tickers"

  return (
    <div className="space-y-1.5 md:w-auto">
      <Label htmlFor="trade-filter-ticker" className="text-xs text-muted-foreground md:hidden">
        Ticker
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="trade-filter-ticker"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Filter trades by ticker"
            className={cn(
              "h-9 w-full justify-between px-3 text-sm font-normal md:w-[9.5rem]",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate font-mono">{label}</span>
            <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[14rem] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search ticker..." />
            <CommandList>
              <CommandEmpty>No ticker found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-tickers"
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 size-4", value === null ? "opacity-100" : "opacity-0")} />
                  All tickers
                </CommandItem>
                {tickers.map((ticker) => (
                  <CommandItem
                    key={ticker}
                    value={ticker}
                    onSelect={() => {
                      onChange(ticker)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn("mr-2 size-4", value === ticker ? "opacity-100" : "opacity-0")}
                    />
                    {ticker}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function TradeFiltersForm({
  filters,
  tickers,
  onChange,
}: {
  filters: TradeFilters
  tickers: string[]
  onChange: (patch: Partial<TradeFilters>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:flex md:flex-wrap md:items-end">
      <FilterSelect
        id="trade-filter-side"
        label="Side"
        ariaLabel="Filter trades by side"
        value={filters.side}
        options={SIDE_OPTIONS}
        onChange={(side) => onChange({ side })}
        triggerClassName="h-9 w-full md:w-[7.5rem]"
      />
      <FilterSelect
        id="trade-filter-asset"
        label="Asset"
        ariaLabel="Filter trades by asset"
        value={filters.assetType}
        options={ASSET_OPTIONS}
        onChange={(assetType) => onChange({ assetType })}
        triggerClassName="h-9 w-full md:w-[7.5rem]"
      />
      <TradeTickerFilter
        tickers={tickers}
        value={filters.ticker}
        onChange={(ticker) => onChange({ ticker })}
      />
      <TradeDateFilter
        value={filters.dateRange}
        onChange={(dateRange) => onChange({ dateRange })}
      />
    </div>
  )
}

export function TradesList({
  trades: initialTrades,
  total,
  page,
  pageSize,
  tickers,
}: TradesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const trades = initialTrades || []

  const filters = useMemo(
    () => parseTradeFiltersFromSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )

  const replaceQuery = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const setFilters = useCallback(
    (next: TradeFilters) => {
      const params = mergePageSearchParams(tradeFiltersToSearchParams(next), 1, pageSize)
      replaceQuery(params)
    },
    [pageSize, replaceQuery],
  )

  const patchFilters = useCallback(
    (patch: Partial<TradeFilters>) => {
      setFilters({ ...filters, ...patch })
    },
    [filters, setFilters],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      const params = mergePageSearchParams(tradeFiltersToSearchParams(filters), nextPage, pageSize)
      replaceQuery(params)
    },
    [filters, pageSize, replaceQuery],
  )

  const setPageSize = useCallback(
    (nextSize: PageSize) => {
      const params = mergePageSearchParams(tradeFiltersToSearchParams(filters), 1, nextSize)
      replaceQuery(params)
    },
    [filters, replaceQuery],
  )

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null)
  const [exporting, setExporting] = useState(false)

  const filtersActive = hasActiveFilters(filters)
  const activeFilterCount =
    [filters.side !== "all", filters.assetType !== "all", filters.ticker !== null, filters.dateRange.from !== null].filter(Boolean).length

  const handleTradeMutated = async () => {
    await invalidateAfterTradeMutation(queryClient)
    router.refresh()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const rows = await listTradesForExport(tradeFiltersToApiParams(filters))
      downloadTradesCsv(rows)
    } catch {
      toast.error("Failed to export trades")
    } finally {
      setExporting(false)
    }
  }

  const renderMobileCard = useCallback(
    (trade: Trade) => (
      <Card className="p-4 gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">{trade.ticker}</span>
            <Badge variant="outline">{trade.asset_type.toUpperCase()}</Badge>
            <Badge variant={trade.side === "buy" ? "default" : "secondary"}>
              {trade.side.charAt(0).toUpperCase() + trade.side.slice(1)}
            </Badge>
          </div>
          <MobileActions
            actions={[
              { label: "Edit", icon: Pencil, onClick: () => setEditingTrade(trade) },
              { label: "Delete", icon: Trash2, destructive: true, onClick: () => setDeletingTrade(trade) },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm">{formatCalendarDate(trade.date)}</p>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-xs text-muted-foreground">Qty</p>
            <p className="text-sm font-mono">{format(trade.quantity, 4)}</p>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-sm font-mono">{formatCurrency(trade.price, MARKET_CONFIG.baseCurrency)}</p>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-xs text-muted-foreground">Fees</p>
            <p className="text-sm font-mono">{formatCurrency(trade.total_fees, MARKET_CONFIG.baseCurrency)}</p>
          </div>
          <div className="col-span-2 space-y-0.5 text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-mono font-semibold">{formatCurrency(trade.total, MARKET_CONFIG.baseCurrency)}</p>
          </div>
          {trade.side === "sell" && trade.realized_pl != null && trade.realized_pl !== "" && (
            <div className="col-span-2 space-y-0.5 text-right">
              <p className="text-xs text-muted-foreground">Realized P/L</p>
              <p
                className={cn(
                  "text-sm font-mono",
                  new Decimal(trade.realized_pl).gte(0) ? "text-primary" : "text-destructive",
                )}
              >
                {formatCurrency(trade.realized_pl, MARKET_CONFIG.baseCurrency)}
              </p>
            </div>
          )}
        </div>
      </Card>
    ),
    [setEditingTrade, setDeletingTrade],
  )

  const columns = useMemo<DataTableColumn<Trade>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (trade) => formatCalendarDate(trade.date),
      },
      {
        key: "ticker",
        header: "Ticker",
        cell: (trade) => (
          <span className="font-mono font-semibold">{trade.ticker}</span>
        ),
      },
      {
        key: "assetType",
        header: "Type",
        cell: (trade) => (
          <Badge variant="outline">{trade.asset_type.toUpperCase()}</Badge>
        ),
      },
      {
        key: "side",
        header: "Side",
        cell: (trade) => (
          <Badge variant={trade.side === "buy" ? "default" : "secondary"}>
            {trade.side.charAt(0).toUpperCase() + trade.side.slice(1)}
          </Badge>
        ),
      },
      {
        key: "quantity",
        header: "Quantity",
        cell: (trade) => format(trade.quantity, 4),
        align: "right",
        className: "font-mono",
      },
      {
        key: "price",
        header: "Price",
        cell: (trade) => formatCurrency(trade.price, MARKET_CONFIG.baseCurrency),
        align: "right",
        className: "font-mono",
      },
      {
        key: "fees",
        header: "Fees",
        cell: (trade) => formatCurrency(trade.total_fees, MARKET_CONFIG.baseCurrency),
        align: "right",
        className: "font-mono",
      },
      {
        key: "total",
        header: "Total",
        cell: (trade) => formatCurrency(trade.total, MARKET_CONFIG.baseCurrency),
        align: "right",
        className: "font-mono font-semibold",
      },
      {
        key: "realizedPL",
        header: "Realized P/L",
        cell: (trade) =>
          trade.side === "sell" && trade.realized_pl != null && trade.realized_pl !== "" ? (
            <span
              className={
                new Decimal(trade.realized_pl).gte(0) ? "text-primary" : "text-destructive"
              }
            >
              {formatCurrency(trade.realized_pl, MARKET_CONFIG.baseCurrency)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        align: "right",
        className: "font-mono",
      },
      {
        key: "actions",
        header: "Actions",
        cell: (trade) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingTrade(trade)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingTrade(trade)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
        align: "right",
        toggleable: false,
      },
    ],
    [],
  )

  const { visibleColumns, visibleKeys, defaultKeys, setVisibleKeys } =
    usePersistedVisibleColumns("trades-table-columns", columns)

  const emptyState = (
    <EmptyState
      title="No trades match these filters"
      action={
        filtersActive && (
          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_TRADE_FILTERS)}>
            Clear filters
          </Button>
        )
      }
    />
  )

  if (total === 0 && !filtersActive) {
    return (
      <section>
        <EmptyState
          title="No trades recorded yet"
          description="Add your first trade to start tracking your portfolio"
        />
      </section>
    )
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
          <div className="hidden md:flex md:flex-wrap md:items-end md:gap-3">
            <TradeFiltersForm filters={filters} tickers={tickers} onChange={patchFilters} />
          </div>
          <MobileFilterDrawer
            activeCount={activeFilterCount}
            description="Adjust the filters to narrow your trades"
            triggerAriaLabel="Open trade filters"
          >
            <TradeFiltersForm filters={filters} tickers={tickers} onChange={patchFilters} />
          </MobileFilterDrawer>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-sm text-muted-foreground" title="Filter URLs can be shared or bookmarked">
              Showing {trades.length} of {total} trades
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExport}
                disabled={total === 0 || exporting}
              >
                <Download className="size-4" />
                Export
              </Button>
              <DataTableColumnToggle
                columns={columns}
                visibleKeys={visibleKeys}
                defaultVisibleKeys={defaultKeys}
                onChange={setVisibleKeys}
                className="hidden md:block"
              />
            </div>
          </div>
        </div>

        {total === 0 ? (
          emptyState
        ) : (
          <>
            <DataTable
              data={trades}
              columns={visibleColumns}
              keyExtractor={(trade) => trade.id}
              emptyState={emptyState}
              renderMobileCard={renderMobileCard}
            />
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </section>

      {editingTrade && (
        <EditTradeDialog
          trade={editingTrade}
          open={!!editingTrade}
          onOpenChange={() => setEditingTrade(null)}
          onSuccess={handleTradeMutated}
        />
      )}

      {deletingTrade && (
        <DeleteTradeDialog
          trade={deletingTrade}
          open={!!deletingTrade}
          onOpenChange={() => setDeletingTrade(null)}
          onSuccess={handleTradeMutated}
        />
      )}
    </>
  )
}
