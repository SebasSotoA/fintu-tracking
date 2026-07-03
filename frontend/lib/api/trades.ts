import { apiClient } from "./client"
import type { PaginatedResult } from "./pagination"
import type { Trade } from "@/lib/types"
import type { PageSize } from "@/lib/pagination/table-pagination"
import { EXPORT_PAGE_SIZE } from "@/lib/pagination/table-pagination"

export interface TradeListQueryParams {
  from?: string
  to?: string
  side?: "buy" | "sell"
  asset_type?: "stock" | "etf" | "crypto"
  ticker?: string
  page?: number
  page_size?: PageSize | typeof EXPORT_PAGE_SIZE
}

function buildTradesQuery(params: TradeListQueryParams): string {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.side) search.set("side", params.side)
  if (params.asset_type) search.set("asset_type", params.asset_type)
  if (params.ticker) search.set("ticker", params.ticker)
  if (params.page != null) search.set("page", String(params.page))
  if (params.page_size != null) search.set("page_size", String(params.page_size))
  const query = search.toString()
  return query ? `?${query}` : ""
}

export interface CreateTradeData {
  date: string
  ticker: string
  asset_type: "stock" | "etf" | "crypto"
  side: "buy" | "sell"
  quantity: string
  price: string
  closing_fee?: string
  deposit_fee?: string
  trading_fee?: string
  broker_id?: string | null
  notes?: string | null
  is_opening_position?: boolean
}

export interface UpdateTradeData {
  date?: string
  ticker?: string
  asset_type?: "stock" | "etf" | "crypto"
  side?: "buy" | "sell"
  quantity?: string
  price?: string
  closing_fee?: string
  deposit_fee?: string
  trading_fee?: string
  broker_id?: string | null
  notes?: string | null
  is_opening_position?: boolean
}

export async function listTrades(
  params?: Omit<TradeListQueryParams, "page" | "page_size">,
): Promise<Trade[]> {
  return apiClient.get<Trade[]>(`/api/trades${buildTradesQuery(params ?? {})}`)
}

export async function listTradesPaginated(
  params: TradeListQueryParams & { page: number; page_size: PageSize | typeof EXPORT_PAGE_SIZE },
): Promise<PaginatedResult<Trade>> {
  const data = await apiClient.get<PaginatedResult<Trade> | Trade[]>(
    `/api/trades${buildTradesQuery(params)}`,
  )
  if (Array.isArray(data)) {
    const start = (params.page - 1) * params.page_size
    return {
      items: data.slice(start, start + params.page_size),
      total: data.length,
      page: params.page,
      page_size: params.page_size,
    }
  }
  return data
}

export async function listTradeTickers(): Promise<string[]> {
  try {
    return await apiClient.get<string[]>("/api/trade-tickers")
  } catch {
    return apiClient.get<string[]>("/api/trades/tickers")
  }
}

export async function listTradesForExport(
  params: Omit<TradeListQueryParams, "page" | "page_size">,
): Promise<Trade[]> {
  const result = await apiClient.get<PaginatedResult<Trade>>(
    `/api/trades${buildTradesQuery({ ...params, page: 1, page_size: EXPORT_PAGE_SIZE })}`,
  )
  return result.items
}

export async function createTrade(data: CreateTradeData): Promise<Trade> {
  return apiClient.post<Trade>("/api/trades", data)
}

export async function updateTrade(id: string, data: UpdateTradeData): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>(`/api/trades/${id}`, data)
}

export async function deleteTrade(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/api/trades/${id}`)
}

