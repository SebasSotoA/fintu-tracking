import { serverGet } from "./server-client"
import type { Holding, MarketPrice } from "@/lib/types"

export interface PerformanceMetrics {
  totalInvested: string
  totalValue: string
  totalReturn: string
  totalReturnPct: string
  xirr: string
}

export async function getHoldings(): Promise<Holding[]> {
  return serverGet<Holding[]>("/api/portfolio/holdings")
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

