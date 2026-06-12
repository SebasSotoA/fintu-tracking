import { apiClient } from "./client"
import type { NetWorthData } from "@/lib/types"

/** Optional date bounds for analytics endpoints that support filtering. */
export interface AnalyticsDateRange {
  startDate?: string
  endDate?: string
}

export type PerformanceInterval = "day" | "week" | "month" | "quarter" | "year"

/** GET /api/analytics/net-worth — canonical analytics types live here. */
export type NetWorthSummary = NetWorthData

/** GET /api/analytics/cash-breakdown */
export interface CashBreakdown {
  deposits_usd: string
  withdrawals_usd: string
  /** Transfer and standalone fees (legacy field; prefer transfer_fees_usd when present). */
  fees_usd: string
  transfer_fees_usd?: string
  cash_flows_net_usd: string
  trade_buys_usd: string
  trade_sells_usd: string
  trade_net_usd: string
  cash_balance: string
}

/** Resolves transfer/standalone fees from cash-breakdown API payload. */
export function getTransferFeesUsd(breakdown: CashBreakdown): string {
  return breakdown.transfer_fees_usd ?? breakdown.fees_usd
}

/** GET /api/analytics/return-attribution */
export interface ReturnAttribution {
  starting_capital: string
  market_gains: string
  market_gains_pct: string
  deposit_fees_impact: string
  trading_fees_impact: string
  closing_fees_impact: string
  total_fees_impact: string
  total_fees_impact_pct: string
  fx_impact: string
  fx_impact_pct: string
  net_position: string
  net_return_pct: string
}

/** GET /api/analytics/fee-breakdown */
export interface FeeBreakdown {
  deposit_fees: string
  trading_fees: string
  closing_fees: string
  maintenance_fees: string
  other_fees: string
  total_fees: string
  fees_by_month: Record<string, string>
}

/** GET /api/analytics/performance-time-series */
export interface PerformancePoint {
  date: string
  portfolio_value: string
  invested_capital: string
  cumulative_fees: string
  cumulative_fx_impact: string
  net_return: string
  net_return_pct: string
  spy_indexed?: string
}

/** GET /api/analytics/fx-impact */
export interface FxImpactReport {
  avg_investment_rate: string
  current_rate: string
  rate_change_pct: string
  fx_impact_usd: string
  fx_impact_pct: string
  impact_by_period: Record<string, string>
}

/** Row in GET /api/analytics/fee-efficiency when group_by=ticker */
export interface FeeEfficiencyTickerRow {
  ticker: string
  trade_count: string
  total_fees: string
  total_value: string
  avg_fee_pct: string
}

/** Parsed fee-efficiency response */
export interface FeeEfficiencyData {
  by_ticker: FeeEfficiencyTickerRow[]
}

/** GET /api/fx-rates/chart */
export interface FxRateChartPoint {
  date: string
  rate: string
}

export function buildDateRangeSearchParams(range?: AnalyticsDateRange): string {
  if (!range) return ""
  const params = new URLSearchParams()
  if (range.startDate) params.set("start_date", range.startDate)
  if (range.endDate) params.set("end_date", range.endDate)
  return params.toString()
}

function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path
}

function isFeeEfficiencyTickerRow(value: unknown): value is FeeEfficiencyTickerRow {
  if (typeof value !== "object" || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.ticker === "string" &&
    typeof row.trade_count === "string" &&
    typeof row.total_fees === "string" &&
    typeof row.total_value === "string" &&
    typeof row.avg_fee_pct === "string"
  )
}

/** Normalizes fee-efficiency API payload into a typed structure. */
export function parseFeeEfficiency(raw: unknown): FeeEfficiencyData {
  if (typeof raw !== "object" || raw === null) {
    return { by_ticker: [] }
  }
  const byTicker = (raw as { by_ticker?: unknown }).by_ticker
  if (!Array.isArray(byTicker)) {
    return { by_ticker: [] }
  }
  return { by_ticker: byTicker.filter(isFeeEfficiencyTickerRow) }
}

export async function getNetWorth(): Promise<NetWorthSummary> {
  return apiClient.get<NetWorthSummary>("/api/analytics/net-worth")
}

export async function getReturnAttribution(): Promise<ReturnAttribution> {
  return apiClient.get<ReturnAttribution>("/api/analytics/return-attribution")
}

export async function getFeeBreakdown(range?: AnalyticsDateRange): Promise<FeeBreakdown> {
  const query = buildDateRangeSearchParams(range)
  return apiClient.get<FeeBreakdown>(withQuery("/api/analytics/fee-breakdown", query))
}

export async function getPerformanceTimeSeries(
  interval: PerformanceInterval = "month",
): Promise<PerformancePoint[]> {
  const query = new URLSearchParams({ interval }).toString()
  return apiClient.get<PerformancePoint[]>(
    withQuery("/api/analytics/performance-time-series", query),
  )
}

export async function getFxImpact(): Promise<FxImpactReport> {
  return apiClient.get<FxImpactReport>("/api/analytics/fx-impact")
}

export async function getFeeEfficiency(groupBy = "ticker"): Promise<FeeEfficiencyData> {
  const query = new URLSearchParams({ group_by: groupBy }).toString()
  const raw = await apiClient.get<unknown>(
    withQuery("/api/analytics/fee-efficiency", query),
  )
  return parseFeeEfficiency(raw)
}

export async function getFxRateChart(days = 30): Promise<FxRateChartPoint[]> {
  return apiClient.get<FxRateChartPoint[]>(`/api/fx-rates/chart?days=${days}`)
}
