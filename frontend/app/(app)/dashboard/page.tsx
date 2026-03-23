import { Suspense } from "react"
import { NetWorthCard } from "@/components/dashboard/net-worth-card"
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import { getHoldings, getNetWorth } from "@/lib/api/server-portfolio"
import { listCashFlows } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"
import type { Holding, CashFlow, FxRate } from "@/lib/types"

async function NetWorthCardServer() {
  const data = await getNetWorth().catch(() => null)
  return <NetWorthCard initialData={data} />
}

async function DashboardData({
  holdingsPromise,
  cashFlowsPromise,
  fxRatesPromise,
}: {
  holdingsPromise: Promise<Holding[]>
  cashFlowsPromise: Promise<CashFlow[]>
  fxRatesPromise: Promise<FxRate[]>
}) {
  const [holdings, cashFlows, fxRates] = await Promise.all([
    holdingsPromise,
    cashFlowsPromise,
    fxRatesPromise,
  ])
  const latestFxRate = fxRates.length > 0 ? fxRates[0].rate : null
  return (
    <>
      <PortfolioSummary holdings={holdings} cashFlows={cashFlows} latestFxRate={latestFxRate} />
      <HoldingsTable holdings={holdings} />
    </>
  )
}

export default function DashboardPage() {
  const holdingsPromise = getHoldings().catch(() => [])
  const cashFlowsPromise = listCashFlows().catch(() => [])
  const fxRatesPromise = listFxRates().catch(() => [])

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your portfolio at a glance</p>
      </div>
      <div className="space-y-6">
        <Suspense fallback={<div className="h-36 bg-muted rounded-lg animate-pulse" />}>
          <NetWorthCardServer />
        </Suspense>
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
            </div>
          }
        >
          <DashboardData
            holdingsPromise={holdingsPromise}
            cashFlowsPromise={cashFlowsPromise}
            fxRatesPromise={fxRatesPromise}
          />
        </Suspense>
      </div>
    </>
  )
}
