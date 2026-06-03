import { serverGet } from "./server-client"
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

function buildTradesQuery(params?: TradeListQueryParams): string {
  if (!params) return ""
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

/** Legacy: full list without pagination params (plain array response). */
export async function listTrades(params?: Omit<TradeListQueryParams, "page" | "page_size">): Promise<Trade[]> {
  return serverGet<Trade[]>(`/api/trades${buildTradesQuery(params)}`)
}

export async function listTradesPaginated(
  params: TradeListQueryParams & { page: number; page_size: PageSize | typeof EXPORT_PAGE_SIZE },
): Promise<PaginatedResult<Trade>> {
  return serverGet<PaginatedResult<Trade>>(`/api/trades${buildTradesQuery(params)}`)
}

/** All rows matching filters for CSV export (capped server-side). */
export async function listTradesForExport(
  params: Omit<TradeListQueryParams, "page" | "page_size">,
): Promise<Trade[]> {
  const result = await listTradesPaginated({
    ...params,
    page: 1,
    page_size: EXPORT_PAGE_SIZE,
  })
  return result.items
}

export async function listTradeTickers(): Promise<string[]> {
  return serverGet<string[]>("/api/trades/tickers")
}
