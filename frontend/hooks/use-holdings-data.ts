"use client"

import { useQuery } from "@tanstack/react-query"
import type { Holding } from "@/lib/types"
import { getHoldingsPaginated, listMarketPrices } from "@/lib/api/portfolio"
import type { PageSize } from "@/lib/pagination/table-pagination"

export interface HoldingsTableData {
  holdings: Holding[]
  total: number
  page: number
  pageSize: PageSize
  priceUpdatedAtByTicker: Record<string, string | null>
  lastPriceRefreshAt: string | null
}

function buildHoldingsData(
  holdingsResult: Awaited<ReturnType<typeof getHoldingsPaginated>>,
  marketPrices: Awaited<ReturnType<typeof listMarketPrices>>,
): HoldingsTableData {
  const priceUpdatedAtByTicker: Record<string, string | null> = {}
  let lastPriceRefreshAt: string | null = null

  marketPrices.forEach((price) => {
    priceUpdatedAtByTicker[price.ticker] = price.updated_at ?? null
    if (!price.updated_at) return
    if (!lastPriceRefreshAt || new Date(price.updated_at) > new Date(lastPriceRefreshAt)) {
      lastPriceRefreshAt = price.updated_at
    }
  })

  return {
    holdings: holdingsResult.items,
    total: holdingsResult.total,
    page: holdingsResult.page,
    pageSize: holdingsResult.page_size as PageSize,
    priceUpdatedAtByTicker,
    lastPriceRefreshAt,
  }
}

export function useHoldingsData(page: number, pageSize: PageSize) {
  return useQuery({
    queryKey: ["holdings", page, pageSize],
    queryFn: async () => {
      const [holdingsResult, marketPrices] = await Promise.all([
        getHoldingsPaginated({ page, page_size: pageSize }),
        listMarketPrices(),
      ])
      return buildHoldingsData(holdingsResult, marketPrices)
    },
  })
}
