"use client"

import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { listCashFlowsForExport } from "@/lib/api/cash-flows"
import { queryKeys } from "@/lib/api/query-keys"
import { PerformanceHero } from "@/components/performance/performance-hero"

const ChartSkeleton = () => (
  <div className="h-64 bg-muted rounded-lg animate-pulse" />
)

const PortfolioPerformanceChart = dynamic(
  () =>
    import("@/components/performance/portfolio-performance-chart").then((m) => ({
      default: m.PortfolioPerformanceChart,
    })),
  { ssr: false, loading: ChartSkeleton },
)

const ReturnAttribution = dynamic(
  () =>
    import("@/components/analytics/return-attribution").then((m) => ({
      default: m.ReturnAttribution,
    })),
  { ssr: false, loading: ChartSkeleton },
)

const FeeAttributionChart = dynamic(
  () =>
    import("@/components/analytics/fee-attribution-chart").then((m) => ({
      default: m.FeeAttributionChart,
    })),
  { ssr: false, loading: ChartSkeleton },
)

const FeeEfficiencyTable = dynamic(
  () =>
    import("@/components/performance/fee-efficiency-table").then((m) => ({
      default: m.FeeEfficiencyTable,
    })),
  { ssr: false, loading: ChartSkeleton },
)

const PerformanceCharts = dynamic(
  () =>
    import("@/components/performance/performance-charts").then((m) => ({
      default: m.PerformanceCharts,
    })),
  { ssr: false, loading: ChartSkeleton },
)

export interface PerformanceContentProps {
  netWorth: NetWorthData | null
}

export function PerformanceContent({ netWorth }: PerformanceContentProps) {
  const { data: cashFlows = [] } = useQuery({
    queryKey: queryKeys.cashFlowsExport(),
    queryFn: () => listCashFlowsForExport(),
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6">
      <PerformanceHero initialNetWorth={netWorth} cashFlows={cashFlows} />
      <PortfolioPerformanceChart />
      <ReturnAttribution />
      <FeeAttributionChart />
      <FeeEfficiencyTable />
      <PerformanceCharts cashFlows={cashFlows} />
    </div>
  )
}
