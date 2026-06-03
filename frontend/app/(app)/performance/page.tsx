import { Suspense } from "react"
import { PerformanceContent } from "@/components/performance/performance-content"
import { getNetWorth } from "@/lib/api/server-analytics"
import type { NetWorthSummary } from "@/lib/api/analytics"
import PerformanceLoading from "./loading"

async function PerformancePageContent({
  netWorthPromise,
}: {
  netWorthPromise: Promise<NetWorthSummary | null>
}) {
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
