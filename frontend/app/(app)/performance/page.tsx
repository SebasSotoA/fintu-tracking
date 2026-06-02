import { Suspense } from "react"
import { PerformanceContent } from "@/components/performance/performance-content"
import { getNetWorth } from "@/lib/api/server-analytics"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"
import type { CashFlow, FxRate } from "@/lib/types"
import type { NetWorthSummary } from "@/lib/api/analytics"
import PerformanceLoading from "./loading"

async function PerformancePageContent({
  netWorthPromise,
  cashFlowsPromise,
  fxRatesPromise,
}: {
  netWorthPromise: Promise<NetWorthSummary | null>
  cashFlowsPromise: Promise<CashFlow[]>
  fxRatesPromise: Promise<FxRate[]>
}) {
  const [netWorth, cashFlows, fxRates] = await Promise.all([
    netWorthPromise,
    cashFlowsPromise,
    fxRatesPromise,
  ])

  return (
    <PerformanceContent
      netWorth={netWorth}
      cashFlows={cashFlows}
      fxRates={fxRates}
    />
  )
}

export default function PerformancePage() {
  const netWorthPromise = getNetWorth().catch(() => null)
  const cashFlowsPromise = listCashFlows().catch(() => [] as CashFlow[])
  const fxRatesPromise = listFxRates().catch(() => [] as FxRate[])

  return (
    <Suspense fallback={<PerformanceLoading />}>
      <PerformancePageContent
        netWorthPromise={netWorthPromise}
        cashFlowsPromise={cashFlowsPromise}
        fxRatesPromise={fxRatesPromise}
      />
    </Suspense>
  )
}
