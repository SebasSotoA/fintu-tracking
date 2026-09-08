import {
  EMPTY_TRADE_DATE_RANGE,
  normalizeTradeDateRange,
  type TradeDateRange,
} from "@/lib/trades/trade-filters"
import { isCashFlowCurrency, type CashFlowCurrency } from "@/lib/market-config/market-config"

export type CashFlowTypeFilter = "all" | "deposit" | "withdrawal" | "cash_adjustment"
export type CashFlowCurrencyFilter = "all" | CashFlowCurrency
export type SortDir = "asc" | "desc"

export const CASH_FLOW_SORT_FIELDS = [
  "date",
  "type",
  "amount",
  "fx_rate",
  "usd_amount",
] as const
export type CashFlowSortField = (typeof CASH_FLOW_SORT_FIELDS)[number]

export const DEFAULT_CASH_FLOW_SORT: CashFlowSortField = "date"
export const DEFAULT_SORT_DIR: SortDir = "desc"

export interface CashFlowFilters {
  type: CashFlowTypeFilter
  currency: CashFlowCurrencyFilter
  dateRange: TradeDateRange
  sort: CashFlowSortField
  dir: SortDir
}

export const DEFAULT_CASH_FLOW_FILTERS: CashFlowFilters = {
  type: "all",
  currency: "all",
  dateRange: EMPTY_TRADE_DATE_RANGE,
  sort: DEFAULT_CASH_FLOW_SORT,
  dir: DEFAULT_SORT_DIR,
}

export interface CashFlowListQueryParams {
  type?: "deposit" | "withdrawal" | "cash_adjustment"
  currency?: CashFlowCurrency
  from?: string
  to?: string
  sort?: CashFlowSortField
  dir?: SortDir
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function isCashFlowSortField(value: string): value is CashFlowSortField {
  return (CASH_FLOW_SORT_FIELDS as readonly string[]).includes(value)
}

function parseSortDir(value: string | undefined): SortDir {
  return value === "asc" || value === "desc" ? value : DEFAULT_SORT_DIR
}

function parseCashFlowSort(value: string | undefined): CashFlowSortField {
  return value && isCashFlowSortField(value) ? value : DEFAULT_CASH_FLOW_SORT
}

function isDefaultSort(sort: CashFlowSortField, dir: SortDir): boolean {
  return sort === DEFAULT_CASH_FLOW_SORT && dir === DEFAULT_SORT_DIR
}

export function hasActiveCashFlowFilters(filters: CashFlowFilters): boolean {
  return (
    filters.type !== "all" ||
    filters.currency !== "all" ||
    filters.dateRange.from !== null
  )
}

export function parseCashFlowFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): CashFlowFilters {
  const typeRaw = firstSearchParam(params.type)
  const type: CashFlowTypeFilter =
    typeRaw === "deposit" ||
    typeRaw === "withdrawal" ||
    typeRaw === "cash_adjustment"
      ? typeRaw
      : "all"

  const currencyRaw = firstSearchParam(params.currency)?.toUpperCase()
  const currency: CashFlowCurrencyFilter =
    currencyRaw && isCashFlowCurrency(currencyRaw) ? currencyRaw : "all"

  const from = firstSearchParam(params.from) ?? null
  const to = firstSearchParam(params.to) ?? null
  const dateRange =
    from !== null ? normalizeTradeDateRange({ from, to: to ?? null }) : EMPTY_TRADE_DATE_RANGE

  const sort = parseCashFlowSort(firstSearchParam(params.sort))
  const dir = parseSortDir(firstSearchParam(params.dir))

  return { type, currency, dateRange, sort, dir }
}

export function cashFlowFiltersToSearchParams(filters: CashFlowFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.type !== "all") params.set("type", filters.type)
  if (filters.currency !== "all") params.set("currency", filters.currency)
  const normalizedRange = normalizeTradeDateRange(filters.dateRange)
  if (normalizedRange.from) {
    params.set("from", normalizedRange.from)
    if (normalizedRange.to) params.set("to", normalizedRange.to)
  }
  if (!isDefaultSort(filters.sort, filters.dir)) {
    params.set("sort", filters.sort)
    params.set("dir", filters.dir)
  }
  return params
}

export function cashFlowFiltersToApiParams(filters: CashFlowFilters): CashFlowListQueryParams {
  const params: CashFlowListQueryParams = {}
  if (filters.type !== "all") params.type = filters.type
  if (filters.currency !== "all") params.currency = filters.currency
  const normalizedRange = normalizeTradeDateRange(filters.dateRange)
  if (normalizedRange.from) {
    params.from = normalizedRange.from
    params.to = normalizedRange.to ?? normalizedRange.from
  }
  if (!isDefaultSort(filters.sort, filters.dir)) {
    params.sort = filters.sort
    params.dir = filters.dir
  }
  return params
}
