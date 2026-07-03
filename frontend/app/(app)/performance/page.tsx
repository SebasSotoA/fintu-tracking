import { Suspense } from "react"
import { PerformanceContent } from "@/components/performance/performance-content"
import { PerformanceEmptyState } from "@/components/performance/performance-empty-state"
import { fetchHoldingsData } from "@/components/dashboard/holdings-table-server"
import { getNetWorth } from "@/lib/api/server-analytics"
import type { NetWorthSummary } from "@/lib/api/analytics"
import PerformanceLoading from "./loading"

async function PerformancePageContent({
  netWorthPromise,
}: {
  netWorthPromise: Promise<NetWorthSummary | null>
}) {
  const holdingsData = await fetchHoldingsData(1, 10)

  if (holdingsData.total === 0) {
    return <PerformanceEmptyState />
  }

  const netWorth = await netWorthPromise
  return <PerformanceContent netWorth={netWorth} />
}

export default function PerformancePage() {
  const netWorthPromise = getNetWorth().catch(() => null)

  return (
    <Suspense fallback={<PerformanceLoading />}>
      <PerformancePageContent netWorthPromise={netWorthPromise} />
    </Suspense>
  )
}
