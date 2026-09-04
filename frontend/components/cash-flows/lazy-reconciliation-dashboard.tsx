"use client"

import dynamic from "next/dynamic"
import { ChartPanelSkeleton } from "@/components/ui/chart-panel-skeleton"

const ReconciliationDashboard = dynamic(
  () =>
    import("@/components/analytics/reconciliation-dashboard").then((m) => ({
      default: m.ReconciliationDashboard,
    })),
  {
    ssr: false,
    loading: () => <ChartPanelSkeleton />,
  },
)

export function LazyReconciliationDashboard() {
  return <ReconciliationDashboard />
}
