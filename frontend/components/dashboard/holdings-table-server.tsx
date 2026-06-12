import { getHoldings, listMarketPrices } from "@/lib/api/server-portfolio"
import { HoldingsTable } from "@/components/dashboard/holdings-table"

export async function HoldingsTableServer() {
  const [holdings, marketPrices] = await Promise.all([
    getHoldings().catch(() => []),
    listMarketPrices().catch(() => []),
  ])

  const priceUpdatedAtByTicker: Record<string, string | null> = {}
  let latestPriceRefresh: string | null = null

  marketPrices.forEach((price) => {
    priceUpdatedAtByTicker[price.ticker] = price.updated_at ?? null
    if (!price.updated_at) return
    if (!latestPriceRefresh || new Date(price.updated_at) > new Date(latestPriceRefresh)) {
      latestPriceRefresh = price.updated_at
    }
  })

  return (
    <HoldingsTable
      holdings={holdings}
      priceUpdatedAtByTicker={priceUpdatedAtByTicker}
      lastPriceRefreshAt={latestPriceRefresh}
    />
  )
}
