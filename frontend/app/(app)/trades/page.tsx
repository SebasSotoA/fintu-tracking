"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useLocale } from "@/components/locale-provider"
import { TradesList } from "@/components/trades/trades-list"
import { TablePageSkeleton } from "@/components/ui/table-page-skeleton"
import { listTradeTickers, listTradesPaginated } from "@/lib/api/trades"
import {
  parseTradeFiltersFromSearchParams,
  tradeFiltersToApiParams,
} from "@/lib/trades/trade-filters"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { PageSize } from "@/lib/pagination/table-pagination"

export default function TradesPage() {
  const { t } = useLocale()
  return (
    <Suspense fallback={<TablePageSkeleton label={t("table.loading")} />}>
      <TradesPageContent />
    </Suspense>
  )
}

function TradesPageContent() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const paramsRecord = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  )
  const filters = useMemo(() => parseTradeFiltersFromSearchParams(paramsRecord), [paramsRecord])
  const { page, pageSize } = useMemo(() => parsePageParams(paramsRecord), [paramsRecord])

  const tradesQuery = useQuery({
    queryKey: ["trades", filters, page, pageSize],
    queryFn: () =>
      listTradesPaginated({
        ...tradeFiltersToApiParams(filters),
        page,
        page_size: pageSize,
      }),
  })

  const tickersQuery = useQuery({
    queryKey: ["trade-tickers"],
    queryFn: listTradeTickers,
  })

  if (tradesQuery.isLoading) {
    return <TablePageSkeleton label={t("table.loading")} />
  }

  const trades = tradesQuery.data?.items ?? []
  const total = tradesQuery.data?.total ?? 0
  const currentPage = tradesQuery.data?.page ?? page
  const currentPageSize = (tradesQuery.data?.page_size ?? pageSize) as PageSize
  const tickers = tickersQuery.data ?? []

  return (
    <TradesList
      trades={trades}
      total={total}
      page={currentPage}
      pageSize={currentPageSize}
      tickers={tickers}
    />
  )
}
