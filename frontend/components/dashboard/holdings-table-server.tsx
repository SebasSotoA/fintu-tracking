import type { Holding, MarketPrice } from "@/lib/types"
import { getHoldings, listMarketPrices } from "@/lib/api/server-portfolio"
import { HoldingsTable } from "@/components/dashboard/holdings-table"

interface HoldingsTableServerProps {
  onQuickTrade?: (ticker: string, assetType: string) => void
}

export interface HoldingsTableData {
  holdings: Holding[]
  priceUpdatedAtByTicker: Record<string, string | null>
  lastPriceRefreshAt: string | null
}

export async function fetchHoldingsData(): Promise<HoldingsTableData> {
  const [holdings, marketPrices] = await Promise.all([
    getHoldings().catch<Holding[]>(() => []),
    listMarketPrices().catch<MarketPrice[]>(() => []),
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

  return { holdings, priceUpdatedAtByTicker, lastPriceRefreshAt }
}

export async function HoldingsTableServer({ onQuickTrade }: HoldingsTableServerProps = {}) {
  const data = await fetchHoldingsData()

  return (
    <HoldingsTable
      holdings={data.holdings}
      priceUpdatedAtByTicker={data.priceUpdatedAtByTicker}
      lastPriceRefreshAt={data.lastPriceRefreshAt}
      onQuickTrade={onQuickTrade}
    />
  )
}
