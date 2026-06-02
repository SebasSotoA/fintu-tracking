"use client"

import type { Trade } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2 } from "lucide-react"
import { formatCurrency, format } from "@/lib/decimal"
import { formatCalendarDate } from "@/lib/date-utils"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { EditTradeDialog } from "./edit-trade-dialog"
import { DeleteTradeDialog } from "./delete-trade-dialog"
import { TradeDateFilter } from "@/components/trades/trade-date-filter"
import {
  DEFAULT_TRADE_FILTERS,
  filterTrades,
  hasActiveFilters,
  type TradeAssetTypeFilter,
  type TradeFilters,
  type TradeSideFilter,
} from "@/lib/trades/trade-filters"

interface TradesListProps {
  trades: Trade[]
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
]

function FilterSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger id={id} className="h-8 w-[7.5rem]" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function TradesList({ trades: initialTrades }: TradesListProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const trades = initialTrades || []
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_TRADE_FILTERS)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null)

  const filteredTrades = useMemo(() => filterTrades(trades, filters), [trades, filters])
  const filtersActive = hasActiveFilters(filters)

  const handleTradeUpdated = () => {
    router.refresh()
    queryClient.invalidateQueries({ queryKey: ["net-worth"] })
  }

  const handleTradeDeleted = () => {
    router.refresh()
    queryClient.invalidateQueries({ queryKey: ["net-worth"] })
  }

  if (trades.length === 0) {
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
                  onChange={(side) => setFilters((prev) => ({ ...prev, side }))}
                />
                <FilterSelect
                  id="trade-filter-asset"
                  label="Asset"
                  value={filters.assetType}
                  options={ASSET_OPTIONS}
                  onChange={(assetType) => setFilters((prev) => ({ ...prev, assetType }))}
                />
                <TradeDateFilter
                  value={filters.dateRange}
                  onChange={(dateRange) => setFilters((prev) => ({ ...prev, dateRange }))}
                />
              </div>
              <p className="pb-2 text-sm text-muted-foreground">
                Showing {filteredTrades.length} of {trades.length} trades
              </p>
            </div>
          </CardHeader>
          <CardContent>
          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No trades match these filters</p>
              {filtersActive && (
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_TRADE_FILTERS)}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
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
                {filteredTrades.map((trade) => (
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
                      {formatCurrency(trade.total_fees || trade.fee, "USD")}
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
          )}
        </CardContent>
        </Card>
      </section>

      {editingTrade && (
        <EditTradeDialog
          trade={editingTrade}
          open={!!editingTrade}
          onOpenChange={() => setEditingTrade(null)}
          onSuccess={handleTradeUpdated}
        />
      )}

      {deletingTrade && (
        <DeleteTradeDialog
          trade={deletingTrade}
          open={!!deletingTrade}
          onOpenChange={() => setDeletingTrade(null)}
          onSuccess={handleTradeDeleted}
        />
      )}
    </>
  )
}
