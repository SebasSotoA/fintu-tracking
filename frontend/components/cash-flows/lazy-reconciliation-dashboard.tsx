"use client"

import dynamic from "next/dynamic"

const ReconciliationDashboard = dynamic(
  () =>
    import("@/components/analytics/reconciliation-dashboard").then((m) => ({
      default: m.ReconciliationDashboard,
    })),
  {
    ssr: false,
    loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" />,
  },
)

export function LazyReconciliationDashboard() {
  return <ReconciliationDashboard />
}
