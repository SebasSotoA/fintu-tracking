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

  try {
    const [result, tickerList] = await Promise.all([
      listTradesPaginated({
        ...tradeFiltersToApiParams(filters),
        page,
        page_size: pageSize,
      }),
      listTradeTickers(),
    ])
    trades = result.items
    total = result.total
    currentPage = result.page
    currentPageSize = result.page_size as PageSize
    tickers = tickerList
  } catch (error) {
    console.error("Failed to fetch trades:", error)
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
