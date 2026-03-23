"use client"

import dynamic from "next/dynamic"

const ChartSkeleton = () => (
  <div className="h-64 bg-muted rounded-lg animate-pulse" />
)

const ReturnAttribution = dynamic(
  () => import("@/components/analytics/return-attribution").then(m => ({ default: m.ReturnAttribution })),
  { ssr: false, loading: ChartSkeleton }
)

const FeeAttributionChart = dynamic(
  () => import("@/components/analytics/fee-attribution-chart").then(m => ({ default: m.FeeAttributionChart })),
  { ssr: false, loading: ChartSkeleton }
)

const PerformanceCharts = dynamic(
  () => import("@/components/performance/performance-charts").then(m => ({ default: m.PerformanceCharts })),
  { ssr: false, loading: ChartSkeleton }
)

const PerformanceMetrics = dynamic(
  () => import("@/components/performance/performance-metrics").then(m => ({ default: m.PerformanceMetrics })),
  { ssr: false, loading: ChartSkeleton }
)

export function PerformanceContent() {
  return (
    <div className="space-y-6">
      <ReturnAttribution />
      <FeeAttributionChart />
      <PerformanceCharts />
      <PerformanceMetrics />
    </div>
  )
}
