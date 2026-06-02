import { serverGet } from "./server-client"
import type { Trade } from "@/lib/types"

export interface TradeListQueryParams {
  from?: string
  to?: string
  side?: "buy" | "sell"
  asset_type?: "stock" | "etf" | "crypto"
  ticker?: string
}

function buildTradesQuery(params?: TradeListQueryParams): string {
  if (!params) return ""
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.side) search.set("side", params.side)
  if (params.asset_type) search.set("asset_type", params.asset_type)
  if (params.ticker) search.set("ticker", params.ticker)
  const query = search.toString()
  return query ? `?${query}` : ""
}

export async function listTrades(params?: TradeListQueryParams): Promise<Trade[]> {
  return serverGet<Trade[]>(`/api/trades${buildTradesQuery(params)}`)
}
