import { Suspense } from "react"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { ReconciliationDashboard } from "@/components/analytics/reconciliation-dashboard"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"
import type { CashFlow, FxRate } from "@/lib/types"

async function CashFlowsContent({
  cashFlowsPromise,
  fxRatesPromise,
  highlightId,
}: {
  cashFlowsPromise: Promise<CashFlow[]>
  fxRatesPromise: Promise<FxRate[]>
  highlightId?: string
}) {
  const [cashFlows, fxRates] = await Promise.all([cashFlowsPromise, fxRatesPromise])
  const recentFxRates = fxRates.slice(0, Math.min(fxRates.length, 90))
  return (
    <>
      <div className="mb-6">
        <FxRateManager recentRates={recentFxRates} />
      </div>
      <CashFlowsList cashFlows={cashFlows} highlightId={highlightId} />
    </>
  )
}

export default async function CashFlowsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>
}) {
  const { highlight } = await searchParams
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
          highlightId={highlight}
        />
      </Suspense>
      <div className="mt-8">
        <ReconciliationDashboard />
      </div>
    </>
  )
}
