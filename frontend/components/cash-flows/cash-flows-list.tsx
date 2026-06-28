"use client"

import type { CashFlow } from "@/lib/types"
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
import { Decimal, formatAmountPlain, formatCurrency } from "@/lib/decimal"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import {
  getCashFlowTypeLabel,
  getFeeAttributionLabel,
  isMirroredTradeFeeRow,
} from "@/lib/cash-flows/cash-flows-list-display"
import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { invalidateAfterCashFlowMutation } from "@/lib/api/query-keys"
import { EditCashFlowDialog } from "./edit-cash-flow-dialog"
import { DeleteCashFlowDialog } from "./delete-cash-flow-dialog"
import Link from "next/link"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DataTableColumnToggle } from "@/components/ui/data-table-column-toggle"
import { EmptyState } from "@/components/ui/empty-state"
import { usePersistedVisibleColumns } from "@/hooks/use-persisted-visible-columns"

interface CashFlowsListProps {
  cashFlows: CashFlow[]
  total: number
  page: number
  pageSize: PageSize
  highlightId?: string
}

type CashFlowRow = CashFlow & {
  linkedFee?: CashFlow
  feeAttributionLabel?: string | null
}

const TYPE_OPTIONS: { value: CashFlowTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "cash_adjustment", label: "Cash adjustments" },
]

const CURRENCY_OPTIONS: { value: CashFlowCurrencyFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...MARKET_CONFIG.cashFlowCurrencies.map((currency) => ({ value: currency, label: currency })),
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
  const [showTradeFeeAuditRows, setShowTradeFeeAuditRows] = useState(false)

  const filters = useMemo(
    () => parseCashFlowFiltersFromSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )

  const filtersActive = hasActiveCashFlowFilters(filters)
  const visibleCashFlows = useMemo(
    () => (showTradeFeeAuditRows ? cashFlows : cashFlows.filter((cf) => !isMirroredTradeFeeRow(cf))),
    [cashFlows, showTradeFeeAuditRows],
  )
  const linkedFeeByParentId = useMemo(() => {
    const byParentId = new Map<string, CashFlow>()
    cashFlows.forEach((cf) => {
      if (
        cf.type === "fee" &&
        (cf.related_type === "deposit" || cf.related_type === "withdrawal") &&
        cf.related_cash_flow_id
      ) {
        byParentId.set(cf.related_cash_flow_id, cf)
      }
    })
    return byParentId
  }, [cashFlows])

  const rows = useMemo<CashFlowRow[]>(
    () =>
      visibleCashFlows.map((cf) => ({
        ...cf,
        linkedFee:
          cf.type === "deposit" || cf.type === "withdrawal"
            ? linkedFeeByParentId.get(cf.id)
            : undefined,
        feeAttributionLabel: cf.type === "fee" ? getFeeAttributionLabel(cashFlows, cf) : null,
      })),
    [visibleCashFlows, linkedFeeByParentId, cashFlows],
  )

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

  const columns = useMemo<DataTableColumn<CashFlowRow>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (cf) => formatCalendarDate(cf.date),
      },
      {
        key: "type",
        header: "Type",
        cell: (cf) => (
          <Badge
            variant={
              cf.type === "deposit"
                ? "default"
                : cf.type === "withdrawal"
                  ? "secondary"
                  : cf.type === "fee"
                    ? "destructive"
                    : "outline"
            }
          >
            {getCashFlowTypeLabel(cf.type)}
          </Badge>
        ),
      },
      {
        key: "copWired",
        header: `${MARKET_CONFIG.localCurrency} wired`,
        cell: (cf) => {
          const value =
            cf.type === "deposit" || cf.type === "withdrawal"
              ? formatAmountPlain(cf.amount, MARKET_CONFIG.localCurrency)
              : "—"
          return <span className="font-mono">{value}</span>
        },
        align: "right",
      },
      {
        key: "fxRate",
        header: "FX",
        cell: (cf) => {
          const value =
            cf.type === "deposit" || cf.type === "withdrawal" ? (cf.fx_rate ?? "—") : "—"
          return <span className="font-mono">{value}</span>
        },
        align: "right",
      },
      {
        key: "feeAmount",
        header: "Fee",
        cell: (cf) => {
          const value =
            cf.type === "deposit" || cf.type === "withdrawal"
              ? cf.linkedFee
                ? formatCurrency(cf.linkedFee.amount, MARKET_CONFIG.baseCurrency)
                : "—"
              : cf.type === "fee"
                ? formatCurrency(cf.amount, MARKET_CONFIG.baseCurrency)
                : "—"
          return <span className="font-mono">{value}</span>
        },
        align: "right",
      },
      {
        key: "usdCredited",
        header: `${MARKET_CONFIG.baseCurrency} (net)`,
        cell: (cf) => {
          const value =
            cf.type === "withdrawal"
              ? `-${formatCurrency(new Decimal(cf.usd_amount || "0").abs().toString(), MARKET_CONFIG.baseCurrency)}`
              : cf.type === "deposit"
                ? formatCurrency(cf.usd_amount, MARKET_CONFIG.baseCurrency)
                : cf.type === "cash_adjustment"
                  ? formatCurrency(cf.amount, MARKET_CONFIG.baseCurrency)
                  : "—"
          return <span className="font-mono font-semibold">{value}</span>
        },
        align: "right",
      },
      {
        key: "attribution",
        header: "Attribution",
        className: "w-[12%] min-w-[8rem] max-w-[10rem]",
        cell: (cf) => {
          if (cf.related_type === "trade" && cf.related_trade_id) {
            return (
              <Link href={`/trades?highlight=${cf.related_trade_id}`} className="inline-flex max-w-full">
                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 w-full">
                  <LinkIcon className="h-3 w-3 mr-1 shrink-0" />
                  <span className="text-xs truncate">Trade</span>
                </Button>
              </Link>
            )
          }
          if (cf.feeAttributionLabel && cf.related_cash_flow_id) {
            return (
              <Link href={`/cash-flows?highlight=${cf.related_cash_flow_id}`} className="inline-flex max-w-full">
                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 w-full text-left">
                  <LinkIcon className="h-3 w-3 mr-1 shrink-0" />
                  <span className="text-xs truncate">{cf.feeAttributionLabel}</span>
                </Button>
              </Link>
            )
          }
          if (cf.related_cash_flow_id) {
            return (
              <Link href={`/cash-flows?highlight=${cf.related_cash_flow_id}`} className="inline-flex max-w-full">
                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 w-full">
                  <LinkIcon className="h-3 w-3 mr-1 shrink-0" />
                  <span className="text-xs truncate capitalize">{cf.related_type ?? "Cash flow"}</span>
                </Button>
              </Link>
            )
          }
          return (
            <span className="text-muted-foreground text-sm truncate block max-w-full">
              {cf.related_type === "standalone" ? "Standalone" : "-"}
            </span>
          )
        },
      },
      {
        key: "notes",
        header: "Notes",
        className: "w-[15%] min-w-[8rem] max-w-[12rem]",
        cell: (cf) => (
          <span className="text-muted-foreground text-sm truncate block max-w-full">{cf.notes || "-"}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (cf) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingCashFlow(cf)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingCashFlow(cf)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
        align: "right",
        toggleable: false,
      },
    ],
    [setEditingCashFlow, setDeletingCashFlow],
  )

  const { visibleColumns, visibleKeys, defaultKeys, setVisibleKeys } =
    usePersistedVisibleColumns("cash-flows-table-columns", columns)

  const emptyState = (
    <EmptyState
      title="No cash flows match these filters"
      action={
        filtersActive && (
          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_CASH_FLOW_FILTERS)}>
            Clear filters
          </Button>
        )
      }
    />
  )

  if (total === 0 && !filtersActive) {
    return (
      <EmptyState
        title="No cash flows recorded yet"
        description="Add your first deposit or withdrawal to start tracking"
      />
    )
  }

  return (
    <>
      <section className="space-y-4">
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
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {visibleCashFlows.length} of {total} cash flows
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showTradeFeeAuditRows ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTradeFeeAuditRows((current) => !current)}
              >
                Show trade fee audit rows
              </Button>
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
              <DataTableColumnToggle
                columns={columns}
                visibleKeys={visibleKeys}
                defaultVisibleKeys={defaultKeys}
                onChange={setVisibleKeys}
              />
            </div>
          </div>
        </div>

        {total === 0 ? (
          emptyState
        ) : (
          <>
            <DataTable
              data={rows}
              columns={visibleColumns}
              keyExtractor={(cf) => cf.id}
              rowClassName={(cf) =>
                cf.id === highlightId ? "bg-accent/40 ring-1 ring-inset ring-border" : undefined
              }
              emptyState={emptyState}
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
