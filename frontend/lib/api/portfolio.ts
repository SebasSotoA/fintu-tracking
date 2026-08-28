import { apiClient } from "./client"
import type { Holding, MarketPrice } from "@/lib/types"
import type { PaginatedResult } from "./pagination"
import type { PageSize } from "@/lib/pagination/table-pagination"

export { ApiError } from "./client"

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

export async function getHoldingsPaginated(
  params: HoldingsQueryParams,
): Promise<PaginatedResult<Holding>> {
  const search = new URLSearchParams()
  if (params.page != null) search.set("page", String(params.page))
  if (params.page_size != null) search.set("page_size", String(params.page_size))
  const query = search.toString()
  return apiClient.get<PaginatedResult<Holding>>(`/api/portfolio/holdings${query ? `?${query}` : ""}`)
}

export async function getHoldings(): Promise<Holding[]> {
  return apiClient.get<Holding[]>("/api/portfolio/holdings")
}

export async function getPerformance(): Promise<PerformanceMetrics> {
  return apiClient.get<PerformanceMetrics>("/api/portfolio/performance")
}

export async function listMarketPrices(): Promise<MarketPrice[]> {
  return apiClient.get<MarketPrice[]>("/api/market-prices")
}

export async function getMarketPrice(ticker: string): Promise<MarketPrice> {
  return apiClient.get<MarketPrice>(`/api/market-prices/${ticker}`)
}

export interface RefreshResult {
  updated: number
  tickers: string[]
  errors: string[]
}

export async function refreshMarketPrices(): Promise<RefreshResult> {
  return apiClient.post<RefreshResult>("/api/market-prices/refresh", {})
}

export interface SymbolSearchResult {
  symbol: string
  name: string
  asset_type: "stock" | "etf" | "crypto"
}

export async function searchMarketSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim()
  if (!q) return []
  return apiClient.get<SymbolSearchResult[]>(`/api/market-prices/search?q=${encodeURIComponent(q)}`)
}

