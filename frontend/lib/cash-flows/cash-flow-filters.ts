import {
  EMPTY_TRADE_DATE_RANGE,
  normalizeTradeDateRange,
  type TradeDateRange,
} from "@/lib/trades/trade-filters"

export type CashFlowTypeFilter = "all" | "deposit" | "withdrawal" | "fee"
export type CashFlowCurrencyFilter = "all" | "USD" | "COP"

export interface CashFlowFilters {
  type: CashFlowTypeFilter
  currency: CashFlowCurrencyFilter
  dateRange: TradeDateRange
}

export const DEFAULT_CASH_FLOW_FILTERS: CashFlowFilters = {
  type: "all",
  currency: "all",
  dateRange: EMPTY_TRADE_DATE_RANGE,
}

export interface CashFlowListQueryParams {
  type?: "deposit" | "withdrawal" | "fee"
  currency?: "USD" | "COP"
  from?: string
  to?: string
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
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
    typeRaw === "deposit" || typeRaw === "withdrawal" || typeRaw === "fee" ? typeRaw : "all"

  const currencyRaw = firstSearchParam(params.currency)?.toUpperCase()
  const currency: CashFlowCurrencyFilter =
    currencyRaw === "USD" || currencyRaw === "COP" ? currencyRaw : "all"

  const from = firstSearchParam(params.from) ?? null
  const to = firstSearchParam(params.to) ?? null
  const dateRange =
    from !== null ? normalizeTradeDateRange({ from, to: to ?? null }) : EMPTY_TRADE_DATE_RANGE

  return { type, currency, dateRange }
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
  return params
}
