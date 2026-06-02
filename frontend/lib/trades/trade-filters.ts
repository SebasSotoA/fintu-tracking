import { formatCalendarDate } from "@/lib/date-utils"
import type { Trade } from "@/lib/types"
import { startOfYear, subDays, subMonths } from "date-fns"

export type TradeSideFilter = "all" | "buy" | "sell"
export type TradeAssetTypeFilter = "all" | "stock" | "etf"
export type TradeDatePreset = "last30d" | "ytd" | "12m"

export interface TradeDateRange {
  from: string | null
  to: string | null
}

export interface TradeFilters {
  side: TradeSideFilter
  assetType: TradeAssetTypeFilter
  dateRange: TradeDateRange
}

export const EMPTY_TRADE_DATE_RANGE: TradeDateRange = { from: null, to: null }

export const DEFAULT_TRADE_FILTERS: TradeFilters = {
  side: "all",
  assetType: "all",
  dateRange: EMPTY_TRADE_DATE_RANGE,
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

    const day = tradeCalendarDay(trade)
    if (!day) return false

    if (!matchesDateRange(day, filters.dateRange)) return false

    return true
  })
}

export function hasActiveFilters(filters: TradeFilters): boolean {
  return (
    filters.side !== "all" ||
    filters.assetType !== "all" ||
    filters.dateRange.from !== null
  )
}
