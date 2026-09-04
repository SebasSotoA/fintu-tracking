"use client"

import dynamic from "next/dynamic"
import type { NetWorthData } from "@/lib/types"
import { PerformanceInsightStrip } from "@/components/performance/performance-insight-strip"
import { PerformanceNowCard } from "@/components/performance/performance-now-card"
import { FeesBreakdown } from "@/components/performance/fees-breakdown"
import { FxImpactCard } from "@/components/performance/fx-impact-card"
import { useLocale } from "@/components/locale-provider"
import { ChartPanelSkeleton } from "@/components/ui/chart-panel-skeleton"

export function ChartSkeleton() {
  const { t } = useLocale()
  return <ChartPanelSkeleton height="short" withCard label={t("table.loading")} />
}

const PortfolioPerformanceChart = dynamic(
  () =>
    import("@/components/performance/portfolio-performance-chart").then((m) => ({
      default: m.PortfolioPerformanceChart,
    })),
  { ssr: false, loading: ChartSkeleton },
)

export interface PerformanceContentProps {
  netWorth: NetWorthData | null
}

export function PerformanceContent({ netWorth }: PerformanceContentProps) {
  return (
    <div className="space-y-6">
      <PerformanceInsightStrip initialNetWorth={netWorth} />
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[320px_1fr]">
        <PerformanceNowCard initialNetWorth={netWorth} />
        <PortfolioPerformanceChart />
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
        <FeesBreakdown />
        <FxImpactCard />
      </div>
    </div>
  )
}
