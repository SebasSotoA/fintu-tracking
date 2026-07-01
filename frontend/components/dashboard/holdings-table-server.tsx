import type { Holding } from "@/lib/types"
import { getHoldingsPaginated, listMarketPrices } from "@/lib/api/server-portfolio"
import { handleServerAuthError } from "@/lib/api/server-client"
import { isApiError, isSubscriptionRequiredError } from "@/lib/api/errors"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import type { PageSize } from "@/lib/pagination/table-pagination"

function handlePortfolioFetchError(error: unknown): never {
  if (isApiError(error) && (error.status === 401 || isSubscriptionRequiredError(error))) {
    handleServerAuthError(error)
  }
  throw error
}

interface HoldingsTableServerProps {
  page: number
  pageSize: PageSize
  onQuickTrade?: (ticker: string, assetType: string) => void
}

export interface HoldingsTableData {
  holdings: Holding[]
  total: number
  page: number
  pageSize: PageSize
  priceUpdatedAtByTicker: Record<string, string | null>
  lastPriceRefreshAt: string | null
}

export async function fetchHoldingsData(
  page: number,
  pageSize: PageSize,
): Promise<HoldingsTableData> {
  const [holdingsResult, marketPrices] = await Promise.all([
    getHoldingsPaginated({ page, page_size: pageSize }).catch((error) =>
      handlePortfolioFetchError(error),
    ),
    listMarketPrices().catch((error) => handlePortfolioFetchError(error)),
  ])

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

export async function HoldingsTableServer({
  page,
  pageSize,
  onQuickTrade,
}: HoldingsTableServerProps) {
  const data = await fetchHoldingsData(page, pageSize)

  return (
    <HoldingsTable
      holdings={data.holdings}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      priceUpdatedAtByTicker={data.priceUpdatedAtByTicker}
      lastPriceRefreshAt={data.lastPriceRefreshAt}
      onQuickTrade={onQuickTrade}
    />
  )
}
