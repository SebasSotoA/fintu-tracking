"use client"

import dynamic from "next/dynamic"
import type { CashFlow, FxRate, NetWorthData } from "@/lib/types"
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

const FxImpactCard = dynamic(
  () =>
    import("@/components/performance/fx-impact-card").then((m) => ({
      default: m.FxImpactCard,
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
  cashFlows: CashFlow[]
  fxRates: FxRate[]
}

export function PerformanceContent({
  netWorth,
  cashFlows,
  fxRates,
}: PerformanceContentProps) {
  return (
    <div className="space-y-6">
      <PerformanceHero
        initialNetWorth={netWorth}
        cashFlows={cashFlows}
        fxRates={fxRates}
      />
      <PortfolioPerformanceChart />
      <ReturnAttribution />
      <FeeAttributionChart />
      <FeeEfficiencyTable />
      <FxImpactCard />
      <PerformanceCharts cashFlows={cashFlows} fxRates={fxRates} />
    </div>
  )
}
