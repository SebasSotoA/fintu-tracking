"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { TradesList } from "@/components/trades/trades-list"
import { listTradeTickers, listTradesPaginated } from "@/lib/api/trades"
import {
  parseTradeFiltersFromSearchParams,
  tradeFiltersToApiParams,
} from "@/lib/trades/trade-filters"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { PageSize } from "@/lib/pagination/table-pagination"
import { Spinner } from "@/components/ui/spinner"

export default function TradesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-96 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      <TradesPageContent />
    </Suspense>
  )
}

function TradesPageContent() {
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
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
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
