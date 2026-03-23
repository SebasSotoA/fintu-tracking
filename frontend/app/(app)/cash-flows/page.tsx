import { Suspense } from "react"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"
import type { CashFlow, FxRate } from "@/lib/types"

async function CashFlowsContent({
  cashFlowsPromise,
  fxRatesPromise,
}: {
  cashFlowsPromise: Promise<CashFlow[]>
  fxRatesPromise: Promise<FxRate[]>
}) {
  const [cashFlows, fxRates] = await Promise.all([cashFlowsPromise, fxRatesPromise])
  const recentFxRates = fxRates.slice(0, 10)
  return (
    <>
      <div className="flex justify-end mb-4">
        <FxRateManager recentRates={recentFxRates} />
      </div>
      <CashFlowsList cashFlows={cashFlows} />
    </>
  )
}

export default function CashFlowsPage() {
  const cashFlowsPromise = listCashFlows().catch(() => [])
  const fxRatesPromise = listFxRates().catch(() => [])

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Cash Flows</h1>
          <p className="text-muted-foreground">Track deposits, withdrawals, and fees</p>
        </div>
        <AddCashFlowDialog />
      </div>
      <Suspense fallback={<div className="h-96 bg-muted rounded-lg animate-pulse" />}>
        <CashFlowsContent
          cashFlowsPromise={cashFlowsPromise}
          fxRatesPromise={fxRatesPromise}
        />
      </Suspense>
    </>
  )
}
