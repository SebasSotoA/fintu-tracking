import { apiClient } from "./client"
import type { Holding, MarketPrice } from "@/lib/types"

export interface PerformanceMetrics {
  totalInvested: string
  totalValue: string
  totalReturn: string
  totalReturnPct: string
  xirr: string
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

