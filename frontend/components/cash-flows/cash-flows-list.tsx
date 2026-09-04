"use client"

import type { CashFlow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MobileActions } from "@/components/ui/mobile-actions"
import { FilterSelect } from "@/components/filters/filter-select"
import { surfaceControlClassName } from "@/components/ui/surface-control"
import { DateRangePicker } from "@/components/filters/date-range-picker"
import { MobileFilterDrawer } from "@/components/ui/mobile-filter-drawer"
import { Download, Pencil, Trash2, LinkIcon } from "lucide-react"
import { listCashFlowsForExport } from "@/lib/api/cash-flows"
import { downloadCashFlowsCsv } from "@/lib/cash-flows/export-cash-flows-csv"
import { AddCashFlowDialog } from "./add-cash-flow-dialog"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatCalendarDate, intlLocale } from "@/lib/date-utils"
import { Decimal, formatAmountPlain, formatCurrency } from "@/lib/decimal"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { useLocale } from "@/components/locale-provider"
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

function CashFlowFiltersForm({
  filters,
  onChange,
}: {
  filters: CashFlowFilters
  onChange: (patch: Partial<CashFlowFilters>) => void
}) {
  const { locale, t } = useLocale()
  const dateLocale = intlLocale(locale)
  const typeOptions: { value: CashFlowTypeFilter; label: string }[] = [
    { value: "all", label: t("cash.all") },
    { value: "deposit", label: t("cash.deposits") },
    { value: "withdrawal", label: t("cash.withdrawals") },
    { value: "cash_adjustment", label: t("cash.cashAdjustments") },
  ]
  const currencyOptions: { value: CashFlowCurrencyFilter; label: string }[] = [
    { value: "all", label: t("cash.all") },
    ...MARKET_CONFIG.cashFlowCurrencies.map((currency) => ({ value: currency, label: currency })),
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:flex md:flex-wrap md:items-end">
      <FilterSelect
        id="cf-filter-type"
        label={t("cash.type")}
        ariaLabel={t("cash.filterByType")}
        value={filters.type}
        options={typeOptions}
        onChange={(type) => onChange({ type })}
        triggerClassName="h-9 w-full md:w-[7.5rem]"
      />
      <FilterSelect
        id="cf-filter-currency"
        label={t("cash.currency")}
        ariaLabel={t("cash.filterByCurrency")}
        value={filters.currency}
        options={currencyOptions}
        onChange={(currency) => onChange({ currency })}
        triggerClassName="h-9 w-full md:w-[7.5rem]"
      />
      <DateRangePicker
        id="cf-filter-date"
        label={t("cash.date")}
        ariaLabel={t("cash.filterByDate")}
        value={filters.dateRange}
        onChange={(dateRange) => onChange({ dateRange })}
        formatLabel={(range) =>
          formatTradeDateRangeLabel(range, dateLocale, t("filters.allDates"))
        }
      />
    </div>
  )
}

export function CashFlowsList({
  cashFlows: initialCashFlows,
  total,
  page,
  pageSize,
  highlightId,
}: CashFlowsListProps) {
  const { locale, t } = useLocale()
  const dateLocale = intlLocale(locale)
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
  const activeFilterCount =
    [filters.type !== "all", filters.currency !== "all", filters.dateRange.from !== null].filter(Boolean).length
  const visibleCashFlows = useMemo(
    () => cashFlows.filter((cf) => !isMirroredTradeFeeRow(cf)),
    [cashFlows],
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

  const getTypeBadgeClasses = useCallback((type: CashFlow["type"]): string => {
    const base =
      "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"
    if (type === "deposit") {
      return cn(base, "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-400/20")
    }
    if (type === "withdrawal") {
      return cn(base, "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-400/20")
    }
    if (type === "fee") {
      return cn(base, "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-400/20")
    }
    return cn(base, "bg-muted text-muted-foreground")
  }, [])

  const renderMobileCard = useCallback(
    (cf: CashFlowRow) => {
      const copWired =
        cf.type === "deposit" || cf.type === "withdrawal"
          ? formatAmountPlain(cf.amount, MARKET_CONFIG.localCurrency)
          : null
      const fxRate =
        cf.type === "deposit" || cf.type === "withdrawal" ? (cf.fx_rate ?? null) : null
      const fee =
        cf.type === "deposit" || cf.type === "withdrawal"
          ? cf.linkedFee
            ? formatCurrency(cf.linkedFee.amount, MARKET_CONFIG.baseCurrency)
            : null
          : cf.type === "fee"
            ? formatCurrency(cf.amount, MARKET_CONFIG.baseCurrency)
            : null
      const usdNet =
        cf.type === "withdrawal"
          ? `-${formatCurrency(new Decimal(cf.usd_amount || "0").abs().toString(), MARKET_CONFIG.baseCurrency)}`
          : cf.type === "deposit"
            ? formatCurrency(cf.usd_amount, MARKET_CONFIG.baseCurrency)
            : cf.type === "cash_adjustment"
              ? formatCurrency(cf.amount, MARKET_CONFIG.baseCurrency)
              : null

      let attribution: string | null = null
      if (cf.related_type === "trade" && cf.related_trade_id) {
        attribution = t("cash.trade")
      } else if (cf.feeAttributionLabel && cf.related_cash_flow_id) {
        attribution = cf.feeAttributionLabel
      } else if (cf.related_cash_flow_id) {
        attribution = cf.related_type ?? t("cash.cashFlow")
      } else if (cf.related_type === "standalone") {
        attribution = t("cash.standalone")
      }

      return (
        <Card className="p-4 gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{formatCalendarDate(cf.date, dateLocale)}</p>
              <span className={getTypeBadgeClasses(cf.type)}>
                {getCashFlowTypeLabel(cf.type, t)}
              </span>
            </div>
            <MobileActions
              actions={[
                { label: t("cash.edit"), icon: Pencil, onClick: () => setEditingCashFlow(cf) },
                { label: t("cash.delete"), icon: Trash2, destructive: true, onClick: () => setDeletingCashFlow(cf) },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {copWired && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{t("cash.copWired", { currency: MARKET_CONFIG.localCurrency })}</p>
                <p className="text-sm font-mono">{copWired}</p>
              </div>
            )}
            {fxRate && (
              <div className="space-y-0.5 text-right">
                <p className="text-xs text-muted-foreground">{t("cash.fx")}</p>
                <p className="text-sm font-mono">{fxRate}</p>
              </div>
            )}
            {fee && (
              <div className="space-y-0.5 text-right">
                <p className="text-xs text-muted-foreground">{t("cash.fee")}</p>
                <p className="text-sm font-mono">{fee}</p>
              </div>
            )}
            {usdNet && (
              <div className={cn("space-y-0.5", copWired || fxRate || fee ? "text-right" : "col-span-2 text-right")}>
                <p className="text-xs text-muted-foreground">{t("cash.usdNet", { currency: MARKET_CONFIG.baseCurrency })}</p>
                <p className="text-sm font-mono font-semibold">{usdNet}</p>
              </div>
            )}
            {attribution && (
              <div className="col-span-2 space-y-0.5">
                <p className="text-xs text-muted-foreground">{t("cash.attribution")}</p>
                <p className="text-sm capitalize">{attribution}</p>
              </div>
            )}
            {cf.notes && (
              <div className="col-span-2 space-y-0.5">
                <p className="text-xs text-muted-foreground">{t("cash.notes")}</p>
                <p className="text-sm text-muted-foreground">{cf.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )
    },
    [getTypeBadgeClasses, dateLocale, t],
  )

  const rows = useMemo<CashFlowRow[]>(
    () =>
      visibleCashFlows.map((cf) => ({
        ...cf,
        linkedFee:
          cf.type === "deposit" || cf.type === "withdrawal"
            ? linkedFeeByParentId.get(cf.id)
            : undefined,
        feeAttributionLabel: cf.type === "fee" ? getFeeAttributionLabel(cashFlows, cf, t) : null,
      })),
    [visibleCashFlows, linkedFeeByParentId, cashFlows, t],
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
      toast.error(t("cash.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo<DataTableColumn<CashFlowRow>[]>(
    () => [
      {
        key: "date",
        header: t("cash.date"),
        cell: (cf) => formatCalendarDate(cf.date, dateLocale),
      },
      {
        key: "type",
        header: t("cash.type"),
        cell: (cf) => (
          <span className={getTypeBadgeClasses(cf.type)}>
            {getCashFlowTypeLabel(cf.type, t)}
          </span>
        ),
      },
      {
        key: "copWired",
        header: t("cash.copWired", { currency: MARKET_CONFIG.localCurrency }),
        cell: (cf) => {
          const value =
            cf.type === "deposit" || cf.type === "withdrawal"
              ? formatAmountPlain(cf.amount, MARKET_CONFIG.localCurrency)
              : "-"
          return <span className="font-mono">{value}</span>
        },
        align: "right",
      },
      {
        key: "fxRate",
        header: t("cash.fx"),
        cell: (cf) => {
          const value =
            cf.type === "deposit" || cf.type === "withdrawal" ? (cf.fx_rate ?? "-") : "-"
          return <span className="font-mono">{value}</span>
        },
        align: "right",
      },
      {
        key: "feeAmount",
        header: t("cash.fee"),
        cell: (cf) => {
          const value =
            cf.type === "deposit" || cf.type === "withdrawal"
              ? cf.linkedFee
                ? formatCurrency(cf.linkedFee.amount, MARKET_CONFIG.baseCurrency)
                : "-"
              : cf.type === "fee"
                ? formatCurrency(cf.amount, MARKET_CONFIG.baseCurrency)
                : "-"
          return <span className="font-mono">{value}</span>
        },
        align: "right",
      },
      {
        key: "usdCredited",
        header: t("cash.usdNet", { currency: MARKET_CONFIG.baseCurrency }),
        cell: (cf) => {
          const value =
            cf.type === "withdrawal"
              ? `-${formatCurrency(new Decimal(cf.usd_amount || "0").abs().toString(), MARKET_CONFIG.baseCurrency)}`
              : cf.type === "deposit"
                ? formatCurrency(cf.usd_amount, MARKET_CONFIG.baseCurrency)
                : cf.type === "cash_adjustment"
                  ? formatCurrency(cf.amount, MARKET_CONFIG.baseCurrency)
                  : "-"
          return <span className="font-mono font-semibold">{value}</span>
        },
        align: "right",
      },
      {
        key: "attribution",
        header: t("cash.attribution"),
        className: "w-[12%] min-w-[8rem] max-w-[10rem]",
        cell: (cf) => {
          if (cf.related_type === "trade" && cf.related_trade_id) {
            return (
              <Link href={`/trades?highlight=${cf.related_trade_id}`} className="inline-flex max-w-full">
                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 w-full">
                  <LinkIcon className="h-3 w-3 mr-1 shrink-0" />
                  <span className="text-xs truncate">{t("cash.trade")}</span>
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
                  <span className="text-xs truncate capitalize">{cf.related_type ?? t("cash.cashFlow")}</span>
                </Button>
              </Link>
            )
          }
          return (
            <span className="text-muted-foreground text-sm truncate block max-w-full">
              {cf.related_type === "standalone" ? t("cash.standalone") : "-"}
            </span>
          )
        },
      },
      {
        key: "notes",
        header: t("cash.notes"),
        className: "w-[15%] min-w-[8rem] max-w-[12rem]",
        cell: (cf) => (
          <span className="text-muted-foreground text-sm truncate block max-w-full">{cf.notes || "-"}</span>
        ),
      },
      {
        key: "actions",
        header: t("cash.actions"),
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
    [setEditingCashFlow, setDeletingCashFlow, dateLocale, t],
  )

  const { visibleColumns, visibleKeys, defaultKeys, setVisibleKeys } =
    usePersistedVisibleColumns("cash-flows-table-columns", columns)

  const emptyState = (
    <EmptyState
      title={t("cash.noMatch")}
      action={
        filtersActive && (
          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_CASH_FLOW_FILTERS)}>
            {t("cash.clearFilters")}
          </Button>
        )
      }
    />
  )

  if (total === 0 && !filtersActive) {
    return (
      <section className="space-y-4">
        <div className="flex justify-end">
          <AddCashFlowDialog />
        </div>
        <EmptyState
          title={t("cash.emptyTitle")}
          description={t("cash.emptyDescription")}
        />
      </section>
    )
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
          <div className="hidden md:flex md:flex-wrap md:items-end md:gap-3">
            <CashFlowFiltersForm filters={filters} onChange={patchFilters} />
          </div>
          <MobileFilterDrawer
            activeCount={activeFilterCount}
            title={t("filters.title")}
            triggerLabel={t("filters.title")}
            closeLabel={t("filters.close")}
            description={t("cash.filtersDescription")}
            triggerAriaLabel={t("cash.openFilters")}
          >
            <CashFlowFiltersForm filters={filters} onChange={patchFilters} />
          </MobileFilterDrawer>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(surfaceControlClassName, "gap-2 shrink-0")}
              onClick={handleExport}
              disabled={total === 0 || exporting}
            >
              <Download className="size-4" />
              {t("cash.export")}
            </Button>
            <DataTableColumnToggle
              columns={columns}
              visibleKeys={visibleKeys}
              defaultVisibleKeys={defaultKeys}
              onChange={setVisibleKeys}
              className="hidden md:block"
            />
            <AddCashFlowDialog />
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
              renderMobileCard={renderMobileCard}
            />
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              showingText={t("cash.showing", { shown: visibleCashFlows.length, total })}
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
