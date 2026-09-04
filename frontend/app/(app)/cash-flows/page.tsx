"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { CashFlowsList } from "@/components/cash-flows/cash-flows-list"
import { CashFlowsPageSkeleton } from "@/components/cash-flows/cash-flows-page-skeleton"
import { FxRateManager } from "@/components/cash-flows/fx-rate-manager"
import { LazyReconciliationDashboard } from "@/components/cash-flows/lazy-reconciliation-dashboard"
import { useLocale } from "@/components/locale-provider"
import { listCashFlowsPaginated } from "@/lib/api/cash-flows"
import {
  cashFlowFiltersToApiParams,
  parseCashFlowFiltersFromSearchParams,
} from "@/lib/cash-flows/cash-flow-filters"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { PageSize } from "@/lib/pagination/table-pagination"

export default function CashFlowsPage() {
  const { t } = useLocale()
  return (
    <Suspense fallback={<CashFlowsPageSkeleton label={t("table.loading")} />}>
      <CashFlowsPageContent />
    </Suspense>
  )
}

function CashFlowsPageContent() {
  const { t } = useLocale()
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
    return <CashFlowsPageSkeleton label={t("table.loading")} />
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
