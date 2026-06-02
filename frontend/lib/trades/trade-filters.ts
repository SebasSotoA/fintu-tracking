import { formatCalendarDate } from "@/lib/date-utils"
import type { Trade } from "@/lib/types"
import type { TradeListQueryParams } from "@/lib/api/server-trades"
import { startOfYear, subDays, subMonths } from "date-fns"

export type TradeSideFilter = "all" | "buy" | "sell"
export type TradeAssetTypeFilter = "all" | "stock" | "etf" | "crypto"
export type TradeDatePreset = "last30d" | "ytd" | "12m"

export interface TradeDateRange {
  from: string | null
  to: string | null
}

export interface TradeFilters {
  side: TradeSideFilter
  assetType: TradeAssetTypeFilter
  dateRange: TradeDateRange
  ticker: string | null
}

export const EMPTY_TRADE_DATE_RANGE: TradeDateRange = { from: null, to: null }

export const DEFAULT_TRADE_FILTERS: TradeFilters = {
  side: "all",
  assetType: "all",
  dateRange: EMPTY_TRADE_DATE_RANGE,
  ticker: null,
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function tradeCalendarDay(trade: Trade): string {
  const day = trade.date.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ""
}

export function calendarDayFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function normalizeTradeDateRange(range: TradeDateRange): TradeDateRange {
  if (!range.from) return EMPTY_TRADE_DATE_RANGE
  if (!range.to) return { from: range.from, to: null }
  if (range.from > range.to) return { from: range.to, to: range.from }
  return range
}

export function applyTradeDatePreset(
  preset: TradeDatePreset,
  reference = new Date(),
): TradeDateRange {
  const to = calendarDayFromDate(reference)
  switch (preset) {
    case "last30d":
      return { from: calendarDayFromDate(subDays(reference, 30)), to }
    case "ytd":
      return { from: calendarDayFromDate(startOfYear(reference)), to }
    case "12m":
      return { from: calendarDayFromDate(subMonths(reference, 12)), to }
  }
}

export function formatTradeDateRangeLabel(range: TradeDateRange): string {
  if (!range.from) return "All dates"
  if (!range.to || range.to === range.from) {
    return formatCalendarDate(range.from)
  }
  return `${formatCalendarDate(range.from)} – ${formatCalendarDate(range.to)}`
}

function matchesDateRange(day: string, range: TradeDateRange): boolean {
  const normalized = normalizeTradeDateRange(range)
  if (!normalized.from) return true
  if (!normalized.to) return day === normalized.from
  return day >= normalized.from && day <= normalized.to
}

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((trade) => {
    if (filters.side !== "all" && trade.side !== filters.side) return false
    if (filters.assetType !== "all" && trade.asset_type !== filters.assetType) return false
    if (filters.ticker && trade.ticker.toUpperCase() !== filters.ticker.toUpperCase()) return false

    const day = tradeCalendarDay(trade)
    if (!day) return false

    if (!matchesDateRange(day, filters.dateRange)) return false

    return true
  })
}

export function uniqueTradeTickers(trades: Trade[]): string[] {
  const tickers = new Set(trades.map((trade) => trade.ticker.toUpperCase()))
  return [...tickers].sort((a, b) => a.localeCompare(b))
}

export function hasActiveFilters(filters: TradeFilters): boolean {
  return (
    filters.side !== "all" ||
    filters.assetType !== "all" ||
    filters.dateRange.from !== null ||
    filters.ticker !== null
  )
}

export function parseTradeFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): TradeFilters {
  const sideRaw = firstSearchParam(params.side)
  const side: TradeSideFilter =
    sideRaw === "buy" || sideRaw === "sell" ? sideRaw : "all"

  const assetRaw = firstSearchParam(params.asset)
  const assetType: TradeAssetTypeFilter =
    assetRaw === "stock" || assetRaw === "etf" || assetRaw === "crypto" ? assetRaw : "all"

  const from = firstSearchParam(params.from) ?? null
  const to = firstSearchParam(params.to) ?? null
  const dateRange =
    from !== null ? normalizeTradeDateRange({ from, to: to ?? null }) : EMPTY_TRADE_DATE_RANGE

  const tickerRaw = firstSearchParam(params.ticker)?.trim()
  const ticker = tickerRaw ? tickerRaw.toUpperCase() : null

  return { side, assetType, dateRange, ticker }
}

export function tradeFiltersToSearchParams(filters: TradeFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.side !== "all") params.set("side", filters.side)
  if (filters.assetType !== "all") params.set("asset", filters.assetType)
  const normalizedRange = normalizeTradeDateRange(filters.dateRange)
  if (normalizedRange.from) {
    params.set("from", normalizedRange.from)
    if (normalizedRange.to) params.set("to", normalizedRange.to)
  }
  if (filters.ticker) params.set("ticker", filters.ticker)
  return params
}

export function tradeFiltersToApiParams(filters: TradeFilters): TradeListQueryParams {
  const params: TradeListQueryParams = {}
  if (filters.side !== "all") params.side = filters.side
  if (filters.assetType !== "all") params.asset_type = filters.assetType
  const normalizedRange = normalizeTradeDateRange(filters.dateRange)
  if (normalizedRange.from) {
    params.from = normalizedRange.from
    params.to = normalizedRange.to ?? normalizedRange.from
  }
  if (filters.ticker) params.ticker = filters.ticker
  return params
}
