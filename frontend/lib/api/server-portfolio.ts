import { serverGet } from "./server-client"
import type { Holding, MarketPrice } from "@/lib/types"
import type { PaginatedResult } from "./pagination"
import type { PageSize } from "@/lib/pagination/table-pagination"

export interface PerformanceMetrics {
  totalInvested: string
  totalValue: string
  totalReturn: string
  totalReturnPct: string
  xirr: string
}

export interface HoldingsQueryParams {
  page?: number
  page_size?: PageSize
}

export async function getHoldings(): Promise<Holding[]> {
  return serverGet<Holding[]>("/api/portfolio/holdings")
}

export async function getHoldingsPaginated(
  params: HoldingsQueryParams,
): Promise<PaginatedResult<Holding>> {
  const search = new URLSearchParams()
  if (params.page != null) search.set("page", String(params.page))
  if (params.page_size != null) search.set("page_size", String(params.page_size))
  const query = search.toString()
  return serverGet<PaginatedResult<Holding>>(`/api/portfolio/holdings${query ? `?${query}` : ""}`)
}

export async function getPerformance(): Promise<PerformanceMetrics> {
  return serverGet<PerformanceMetrics>("/api/portfolio/performance")
}

export async function listMarketPrices(): Promise<MarketPrice[]> {
  return serverGet<MarketPrice[]>("/api/market-prices")
}

export async function getMarketPrice(ticker: string): Promise<MarketPrice> {
  return serverGet<MarketPrice>(`/api/market-prices/${ticker}`)
}

