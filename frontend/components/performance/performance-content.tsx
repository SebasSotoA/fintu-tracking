"use client"

import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { listCashFlowsForExport } from "@/lib/api/cash-flows"
import { queryKeys } from "@/lib/api/query-keys"
import { PerformanceHero } from "@/components/performance/performance-hero"
import { MoneyBreakdown } from "@/components/performance/money-breakdown"
import { FeesBreakdown } from "@/components/performance/fees-breakdown"
import { FxImpactCard } from "@/components/performance/fx-impact-card"

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
      <PerformanceHero initialNetWorth={netWorth} />
      <MoneyBreakdown />
      <PortfolioPerformanceChart />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FeesBreakdown cashFlows={cashFlows} />
        <FxImpactCard />
      </div>
    </div>
  )
}