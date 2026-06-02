import { Suspense } from "react"
import { TradesList } from "@/components/trades/trades-list"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { listTrades } from "@/lib/api/server-trades"
import {
  parseTradeFiltersFromSearchParams,
  tradeFiltersToApiParams,
} from "@/lib/trades/trade-filters"
import type { Trade } from "@/lib/types"

interface TradesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TradesPage({ searchParams }: TradesPageProps) {
  const params = await searchParams
  const filters = parseTradeFiltersFromSearchParams(params)

  let trades: Trade[] = []
  try {
    trades = await listTrades(tradeFiltersToApiParams(filters))
  } catch (error) {
    console.error("Failed to fetch trades:", error)
  }

  return (
    <>
      <div className="flex justify-end mb-8">
        <AddTradeDialog />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
        <TradesList trades={trades} />
      </Suspense>
    </>
  )
}
