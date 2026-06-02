import { Suspense } from "react"
import { PerformanceContent } from "@/components/performance/performance-content"
import { getNetWorth } from "@/lib/api/server-analytics"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import type { CashFlow } from "@/lib/types"
import type { NetWorthSummary } from "@/lib/api/analytics"
import PerformanceLoading from "./loading"

async function PerformancePageContent({
  netWorthPromise,
  cashFlowsPromise,
}: {
  netWorthPromise: Promise<NetWorthSummary | null>
  cashFlowsPromise: Promise<CashFlow[]>
}) {
  const [netWorth, cashFlows] = await Promise.all([
    netWorthPromise,
    cashFlowsPromise,
  ])

  return (
    <PerformanceContent
      netWorth={netWorth}
      cashFlows={cashFlows}
    />
  )
}

export default function PerformancePage() {
  const netWorthPromise = getNetWorth().catch(() => null)
  const cashFlowsPromise = listCashFlows().catch(() => [] as CashFlow[])

  return (
    <Suspense fallback={<PerformanceLoading />}>
      <PerformancePageContent
        netWorthPromise={netWorthPromise}
        cashFlowsPromise={cashFlowsPromise}
      />
    </Suspense>
  )
}
