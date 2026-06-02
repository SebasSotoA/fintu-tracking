import { serverGet } from "./server-client"
import type {
  AnalyticsDateRange,
  FeeBreakdown,
  FeeEfficiencyData,
  FxImpactReport,
  FxRateChartPoint,
  NetWorthSummary,
  PerformanceInterval,
  PerformancePoint,
  ReturnAttribution,
} from "./analytics"
import { buildDateRangeSearchParams, parseFeeEfficiency } from "./analytics"

function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path
}

export async function getNetWorth(): Promise<NetWorthSummary> {
  return serverGet<NetWorthSummary>("/api/analytics/net-worth")
}

export async function getReturnAttribution(): Promise<ReturnAttribution> {
  return serverGet<ReturnAttribution>("/api/analytics/return-attribution")
}

export async function getFeeBreakdown(range?: AnalyticsDateRange): Promise<FeeBreakdown> {
  const query = buildDateRangeSearchParams(range)
  return serverGet<FeeBreakdown>(withQuery("/api/analytics/fee-breakdown", query))
}

export async function getPerformanceTimeSeries(
  interval: PerformanceInterval = "month",
): Promise<PerformancePoint[]> {
  const query = new URLSearchParams({ interval }).toString()
  return serverGet<PerformancePoint[]>(
    withQuery("/api/analytics/performance-time-series", query),
  )
}

export async function getFxImpact(): Promise<FxImpactReport> {
  return serverGet<FxImpactReport>("/api/analytics/fx-impact")
}

export async function getFeeEfficiency(groupBy = "ticker"): Promise<FeeEfficiencyData> {
  const query = new URLSearchParams({ group_by: groupBy }).toString()
  const raw = await serverGet<unknown>(withQuery("/api/analytics/fee-efficiency", query))
  return parseFeeEfficiency(raw)
}

export async function getFxRateChart(days = 30): Promise<FxRateChartPoint[]> {
  return serverGet<FxRateChartPoint[]>(`/api/fx-rates/chart?days=${days}`)
}
