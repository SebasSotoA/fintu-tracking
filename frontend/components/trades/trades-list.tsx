"use client"

import type { Trade } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Check, ChevronsUpDown, Download, Pencil, Trash2 } from "lucide-react"
import { formatCurrency, format } from "@/lib/decimal"
import { formatCalendarDate } from "@/lib/date-utils"
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
    <div className="space-y-1.5">
      <Label htmlFor="trade-filter-ticker" className="text-xs text-muted-foreground">
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
              "h-9 w-[9.5rem] justify-between px-3 text-sm font-normal",
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

  if (total === 0 && !filtersActive) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Trade History</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No trades recorded yet</p>
            <p className="text-sm text-muted-foreground">Add your first trade to start tracking your portfolio</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <>
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Trade History</h2>
        <Card>
          <CardHeader className="pb-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <FilterSelect
                  id="trade-filter-side"
                  label="Side"
                  value={filters.side}
                  options={SIDE_OPTIONS}
                  onChange={(side) => patchFilters({ side })}
                />
                <FilterSelect
                  id="trade-filter-asset"
                  label="Asset"
                  value={filters.assetType}
                  options={ASSET_OPTIONS}
                  onChange={(assetType) => patchFilters({ assetType })}
                />
                <TradeTickerFilter
                  tickers={tickers}
                  value={filters.ticker}
                  onChange={(ticker) => patchFilters({ ticker })}
                />
                <TradeDateFilter
                  value={filters.dateRange}
                  onChange={(dateRange) => patchFilters({ dateRange })}
                />
              </div>
              <div className="flex flex-col items-end gap-2 pb-2">
                <p className="text-sm text-muted-foreground" title="Filter URLs can be shared or bookmarked">
                  Showing {trades.length} of {total} trades
                </p>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-2">No trades match these filters</p>
                {filtersActive && (
                  <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_TRADE_FILTERS)}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{formatCalendarDate(trade.date)}</TableCell>
                      <TableCell className="font-mono font-semibold">{trade.ticker}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trade.asset_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trade.side === "buy" ? "default" : "secondary"}>
                          {trade.side.charAt(0).toUpperCase() + trade.side.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{format(trade.quantity, 4)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(trade.price, "USD")}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(trade.total_fees, "USD")}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(trade.total, "USD")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingTrade(trade)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingTrade(trade)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
              </>
            )}
          </CardContent>
        </Card>
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
