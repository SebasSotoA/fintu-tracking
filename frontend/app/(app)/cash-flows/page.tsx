"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { LazyReconciliationDashboard } from "@/components/cash-flows/lazy-reconciliation-dashboard"
import { listCashFlowsPaginated } from "@/lib/api/cash-flows"
import {
  cashFlowFiltersToApiParams,
  parseCashFlowFiltersFromSearchParams,
} from "@/lib/cash-flows/cash-flow-filters"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { PageSize } from "@/lib/pagination/table-pagination"
import { Spinner } from "@/components/ui/spinner"

export default function CashFlowsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-96 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      <CashFlowsPageContent />
    </Suspense>
  )
}

function CashFlowsPageContent() {
  const searchParams = useSearchParams()
  const paramsRecord = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  )
  const highlight = typeof paramsRecord.highlight === "string" ? paramsRecord.highlight : undefined
  const { page, pageSize } = useMemo(() => parsePageParams(paramsRecord), [paramsRecord])
  const filters = useMemo(
    () => parseCashFlowFiltersFromSearchParams(paramsRecord),
    [paramsRecord],
  )

  const cashFlowsQuery = useQuery({
    queryKey: ["cash-flows", filters, page, pageSize],
    queryFn: () =>
      listCashFlowsPaginated({
        ...cashFlowFiltersToApiParams(filters),
        page,
        page_size: pageSize,
      }),
  })

  if (cashFlowsQuery.isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  const cashFlows = cashFlowsQuery.data?.items ?? []
  const total = cashFlowsQuery.data?.total ?? 0
  const currentPage = cashFlowsQuery.data?.page ?? page
  const currentPageSize = (cashFlowsQuery.data?.page_size ?? pageSize) as PageSize

  return (
    <>
      <CashFlowsList
        cashFlows={cashFlows}
        total={total}
        page={currentPage}
        pageSize={currentPageSize}
        highlightId={highlight}
      />
      <div className="mt-8">
        <FxRateManager />
      </div>
      <div className="mt-8">
        <LazyReconciliationDashboard />
      </div>
    </>
  )
}
