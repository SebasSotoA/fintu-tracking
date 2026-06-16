import { Suspense } from "react"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { LazyReconciliationDashboard } from "@/components/cash-flows/lazy-reconciliation-dashboard"
import { listCashFlowsPaginated } from "@/lib/api/server-cash-flows"
import {
  cashFlowFiltersToApiParams,
  parseCashFlowFiltersFromSearchParams,
} from "@/lib/cash-flows/cash-flow-filters"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { CashFlow } from "@/lib/types"
import type { PageSize } from "@/lib/pagination/table-pagination"

async function CashFlowsContent({
  highlightId,
  page,
  pageSize,
  searchParamsRecord,
}: {
  highlightId?: string
  page: number
  pageSize: PageSize
  searchParamsRecord: Record<string, string | string[] | undefined>
}) {
  let cashFlows: CashFlow[] = []
  let total = 0
  let currentPage = page
  let currentPageSize: PageSize = pageSize

  try {
    const filters = parseCashFlowFiltersFromSearchParams(searchParamsRecord)
    const result = await listCashFlowsPaginated({
      ...cashFlowFiltersToApiParams(filters),
      page,
      page_size: pageSize,
    })
    cashFlows = result.items
    total = result.total
    currentPage = result.page
    currentPageSize = result.page_size as PageSize
  } catch (error) {
    console.error("Failed to fetch cash flows:", error)
  }

  return (
    <>
      <CashFlowsList
        cashFlows={cashFlows}
        total={total}
        page={currentPage}
        pageSize={currentPageSize}
        highlightId={highlightId}
      />
      <div className="mt-8">
        <FxRateManager />
      </div>
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

  return (
    <>
      <div className="flex justify-end mb-8">
        <AddCashFlowDialog />
      </div>
      <Suspense fallback={<div className="h-96 bg-muted rounded-lg animate-pulse" />}>
        <CashFlowsContent
          highlightId={highlight}
          page={page}
          pageSize={pageSize}
          searchParamsRecord={params}
        />
      </Suspense>
      <div className="mt-8">
        <LazyReconciliationDashboard />
      </div>
    </>
  )
}
