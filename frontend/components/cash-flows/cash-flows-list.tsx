"use client"

import type { CashFlow } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/filters/filter-select"
import { DateRangePicker } from "@/components/filters/date-range-picker"
import { Download, Pencil, Trash2, LinkIcon } from "lucide-react"
import { listCashFlowsForExport } from "@/lib/api/cash-flows"
import { downloadCashFlowsCsv } from "@/lib/cash-flows/export-cash-flows-csv"
import { TablePagination } from "@/components/ui/table-pagination"
import {
  mergePageSearchParams,
  type PageSize,
} from "@/lib/pagination/table-pagination"
import {
  DEFAULT_CASH_FLOW_FILTERS,
  cashFlowFiltersToSearchParams,
  hasActiveCashFlowFilters,
  parseCashFlowFiltersFromSearchParams,
  type CashFlowCurrencyFilter,
  type CashFlowFilters,
  type CashFlowTypeFilter,
} from "@/lib/cash-flows/cash-flow-filters"
import { formatTradeDateRangeLabel } from "@/lib/trades/trade-filters"
import { toast } from "sonner"
import { formatCalendarDate } from "@/lib/date-utils"
import { formatAmountPlain, formatCurrency } from "@/lib/decimal"
import { getFeeAttributionLabel } from "@/lib/cash-flows/cash-flows-list-display"
import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { invalidateAfterCashFlowMutation } from "@/lib/api/query-keys"
import { EditCashFlowDialog } from "./edit-cash-flow-dialog"
import { DeleteCashFlowDialog } from "./delete-cash-flow-dialog"
import Link from "next/link"

interface CashFlowsListProps {
  cashFlows: CashFlow[]
  total: number
  page: number
  pageSize: PageSize
  highlightId?: string
}

const TYPE_OPTIONS: { value: CashFlowTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "fee", label: "Fees" },
]

const CURRENCY_OPTIONS: { value: CashFlowCurrencyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "USD", label: "USD" },
  { value: "COP", label: "COP" },
]

export function CashFlowsList({
  cashFlows: initialCashFlows,
  total,
  page,
  pageSize,
  highlightId,
}: CashFlowsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const cashFlows = initialCashFlows || []
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null)
  const [deletingCashFlow, setDeletingCashFlow] = useState<CashFlow | null>(null)
  const [exporting, setExporting] = useState(false)

  const filters = useMemo(
    () => parseCashFlowFiltersFromSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )

  const filtersActive = hasActiveCashFlowFilters(filters)

  const replaceQuery = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const patchFilters = useCallback(
    (patch: Partial<CashFlowFilters>) => {
      const next: CashFlowFilters = { ...filters, ...patch }
      const params = mergePageSearchParams(cashFlowFiltersToSearchParams(next), 1, pageSize)
      replaceQuery(params)
    },
    [filters, pageSize, replaceQuery],
  )

  const setFilters = useCallback(
    (next: CashFlowFilters) => {
      const params = mergePageSearchParams(cashFlowFiltersToSearchParams(next), 1, pageSize)
      replaceQuery(params)
    },
    [pageSize, replaceQuery],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged = mergePageSearchParams(params, nextPage, pageSize)
      replaceQuery(merged)
    },
    [pageSize, replaceQuery, searchParams],
  )

  const setPageSize = useCallback(
    (nextSize: PageSize) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged = mergePageSearchParams(params, 1, nextSize)
      replaceQuery(merged)
    },
    [replaceQuery, searchParams],
  )

  const handleUpdated = async () => {
    await invalidateAfterCashFlowMutation(queryClient)
    router.refresh()
  }

  const handleDeleted = async () => {
    await invalidateAfterCashFlowMutation(queryClient)
    router.refresh()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const rows = await listCashFlowsForExport()
      downloadCashFlowsCsv(rows)
    } catch {
      toast.error("Failed to export cash flows")
    } finally {
      setExporting(false)
    }
  }

  if (total === 0 && !filtersActive) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No cash flows recorded yet</p>
          <p className="text-sm text-muted-foreground">Add your first deposit or withdrawal to start tracking</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                id="cf-filter-type"
                label="Type"
                value={filters.type}
                options={TYPE_OPTIONS}
                onChange={(type) => patchFilters({ type })}
              />
              <FilterSelect
                id="cf-filter-currency"
                label="Currency"
                value={filters.currency}
                options={CURRENCY_OPTIONS}
                onChange={(currency) => patchFilters({ currency })}
              />
              <DateRangePicker
                id="cf-filter-date"
                label="Date"
                ariaLabel="Filter cash flows by date"
                value={filters.dateRange}
                onChange={(dateRange) => patchFilters({ dateRange })}
                formatLabel={formatTradeDateRangeLabel}
              />
            </div>
            <div className="flex flex-col items-end gap-2 pb-2">
              <p className="text-sm text-muted-foreground">Showing {cashFlows.length} of {total} cash flows</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
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
              <p className="text-muted-foreground mb-2">No cash flows match these filters</p>
              {filtersActive && (
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_CASH_FLOW_FILTERS)}>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">USD Amount</TableHead>
                      <TableHead>Attribution</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlows.map((cf) => {
                      const feeAttributionLabel = cf.type === "fee" ? getFeeAttributionLabel(cashFlows, cf) : null

                      return (
                        <TableRow
                          key={cf.id}
                          className={
                            cf.id === highlightId
                              ? "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400"
                              : undefined
                          }
                        >
                          <TableCell>{formatCalendarDate(cf.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cf.type === "deposit"
                                  ? "default"
                                  : cf.type === "withdrawal"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {cf.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {cf.fee_type ? (
                              <Badge variant="outline" className="capitalize">
                                {cf.fee_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{cf.currency}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmountPlain(cf.amount, cf.currency as "USD" | "COP")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(cf.usd_amount, "USD")}
                          </TableCell>
                          <TableCell>
                            {cf.related_type === "trade" && cf.related_trade_id ? (
                              <Link href={`/trades?highlight=${cf.related_trade_id}`}>
                                <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  <span className="text-xs">Trade</span>
                                </Button>
                              </Link>
                            ) : feeAttributionLabel && cf.related_cash_flow_id ? (
                              <Link href={`/cash-flows?highlight=${cf.related_cash_flow_id}`}>
                                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-left">
                                  <LinkIcon className="h-3 w-3 mr-1 shrink-0" />
                                  <span className="text-xs">{feeAttributionLabel}</span>
                                </Button>
                              </Link>
                            ) : cf.related_cash_flow_id ? (
                              <Link href={`/cash-flows?highlight=${cf.related_cash_flow_id}`}>
                                <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  <span className="text-xs capitalize">{cf.related_type ?? "Cash flow"}</span>
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {cf.related_type === "standalone" ? "Standalone" : "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                            {cf.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingCashFlow(cf)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeletingCashFlow(cf)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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

      {editingCashFlow && (
        <EditCashFlowDialog
          cashFlow={editingCashFlow}
          cashFlows={cashFlows}
          open={!!editingCashFlow}
          onOpenChange={(open) => !open && setEditingCashFlow(null)}
          onSuccess={handleUpdated}
        />
      )}

      {deletingCashFlow && (
        <DeleteCashFlowDialog
          cashFlow={deletingCashFlow}
          open={!!deletingCashFlow}
          onOpenChange={(open) => !open && setDeletingCashFlow(null)}
          onSuccess={handleDeleted}
        />
      )}
    </>
  )
}
