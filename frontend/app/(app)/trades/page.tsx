import { Suspense } from "react"
import { TradesList } from "@/components/trades/trades-list"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { listTradeTickers, listTradesPaginated } from "@/lib/api/server-trades"
import {
  parseTradeFiltersFromSearchParams,
  tradeFiltersToApiParams,
} from "@/lib/trades/trade-filters"
import { parsePageParams } from "@/lib/pagination/table-pagination"
import type { Trade } from "@/lib/types"
import type { PageSize } from "@/lib/pagination/table-pagination"

interface TradesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TradesPage({ searchParams }: TradesPageProps) {
  const params = await searchParams
  const filters = parseTradeFiltersFromSearchParams(params)
  const { page, pageSize } = parsePageParams(params)

  let trades: Trade[] = []
  let total = 0
  let currentPage = page
  let currentPageSize: PageSize = pageSize
  let tickers: string[] = []

  const [tradesResult, tickersResult] = await Promise.allSettled([
    listTradesPaginated({
      ...tradeFiltersToApiParams(filters),
      page,
      page_size: pageSize,
    }),
    listTradeTickers(),
  ])

  if (tradesResult.status === "fulfilled") {
    trades = tradesResult.value.items
    total = tradesResult.value.total
    currentPage = tradesResult.value.page
    currentPageSize = tradesResult.value.page_size as PageSize
  } else {
    console.error("Failed to fetch trades:", tradesResult.reason)
  }

  if (tickersResult.status === "fulfilled") {
    tickers = tickersResult.value
  } else {
    console.error("Failed to fetch trade tickers:", tickersResult.reason)
  }

  return (
    <>
      <div className="flex justify-end mb-8">
        <AddTradeDialog />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
        <TradesList
          trades={trades}
          total={total}
          page={currentPage}
          pageSize={currentPageSize}
          tickers={tickers}
        />
      </Suspense>
    </>
  )
}
