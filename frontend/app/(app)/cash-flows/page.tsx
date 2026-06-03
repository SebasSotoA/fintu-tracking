import { Suspense } from "react"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { ReconciliationDashboard } from "@/components/analytics/reconciliation-dashboard"
import { listCashFlowsPaginated } from "@/lib/api/server-cash-flows"
import { listFxRates } from "@/lib/api/server-fx-rates"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { CashFlow, FxRate } from "@/lib/types"
import type { PageSize } from "@/lib/pagination/table-pagination"

async function CashFlowsContent({
  fxRatesPromise,
  highlightId,
  page,
  pageSize,
}: {
  fxRatesPromise: Promise<FxRate[]>
  highlightId?: string
  page: number
  pageSize: PageSize
}) {
  const fxRates = await fxRatesPromise
  const recentFxRates = fxRates.slice(0, Math.min(fxRates.length, 90))

  let cashFlows: CashFlow[] = []
  let total = 0
  let currentPage = page
  let currentPageSize: PageSize = pageSize

  try {
    const result = await listCashFlowsPaginated({ page, page_size: pageSize })
    cashFlows = result.items
    total = result.total
    currentPage = result.page
    currentPageSize = result.page_size as PageSize
  } catch (error) {
    console.error("Failed to fetch cash flows:", error)
  }

  return (
    <>
      <div className="mb-6">
        <FxRateManager recentRates={recentFxRates} />
      </div>
      <CashFlowsList
        cashFlows={cashFlows}
        total={total}
        page={currentPage}
        pageSize={currentPageSize}
        highlightId={highlightId}
      />
    </>
  )
}

export default async function CashFlowsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const highlight = typeof params.highlight === "string" ? params.highlight : undefined
  const { page, pageSize } = parsePageParams(params)
  const fxRatesPromise = listFxRates().catch(() => [])

  return (
    <>
      <div className="flex justify-end mb-8">
        <AddCashFlowDialog />
      </div>
      <Suspense fallback={<div className="h-96 bg-muted rounded-lg animate-pulse" />}>
        <CashFlowsContent
          fxRatesPromise={fxRatesPromise}
          highlightId={highlight}
          page={page}
          pageSize={pageSize}
        />
      </Suspense>
      <div className="mt-8">
        <ReconciliationDashboard />
      </div>
    </>
  )
}
