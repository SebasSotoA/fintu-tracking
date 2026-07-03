import { apiClient } from "./client"
import type { PaginatedResult } from "./pagination"
import type { CashFlow } from "@/lib/types"
import type { CashFlowCurrency } from "@/lib/market-config/market-config"
import type { CashFlowListQueryParams } from "@/lib/cash-flows/cash-flow-filters"
import type { PageSize } from "@/lib/pagination/table-pagination"
import { EXPORT_PAGE_SIZE } from "@/lib/pagination/table-pagination"

function buildCashFlowsQuery(
  params?: CashFlowListQueryParams & {
    page?: number
    page_size?: PageSize | typeof EXPORT_PAGE_SIZE
  },
): string {
  if (!params) return ""
  const search = new URLSearchParams()
  if (params.page != null) search.set("page", String(params.page))
  if (params.page_size != null) search.set("page_size", String(params.page_size))
  if (params.type) search.set("type", params.type)
  if (params.currency) search.set("currency", params.currency)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  const query = search.toString()
  return query ? `?${query}` : ""
}

export interface CreateCashFlowData {
  date: string
  type: "deposit" | "withdrawal" | "fee" | "cash_adjustment"
  currency: CashFlowCurrency
  amount: string
  fx_rate?: string | null
  broker_id?: string | null
  notes?: string | null
  fee_type?: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal" | null
  related_trade_id?: string | null
  related_cash_flow_id?: string | null
  related_type?: "trade" | "deposit" | "withdrawal" | "standalone" | null
}

export interface UpdateCashFlowData {
  date?: string
  type?: "deposit" | "withdrawal" | "fee" | "cash_adjustment"
  currency?: CashFlowCurrency
  amount?: string
  fx_rate?: string | null
  broker_id?: string | null
  notes?: string | null
  fee_type?: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal" | null
  related_trade_id?: string | null
  related_cash_flow_id?: string | null
  related_type?: "trade" | "deposit" | "withdrawal" | "standalone" | null
}

export async function listCashFlows(): Promise<CashFlow[]> {
  return apiClient.get<CashFlow[]>("/api/cash-flows")
}

export async function listCashFlowsPaginated(
  params: CashFlowListQueryParams & {
    page: number
    page_size: PageSize | typeof EXPORT_PAGE_SIZE
  },
): Promise<PaginatedResult<CashFlow>> {
  return apiClient.get<PaginatedResult<CashFlow>>(`/api/cash-flows${buildCashFlowsQuery(params)}`)
}

export async function listCashFlowsForExport(): Promise<CashFlow[]> {
  const result = await apiClient.get<PaginatedResult<CashFlow>>(
    `/api/cash-flows?page=1&page_size=${EXPORT_PAGE_SIZE}`,
  )
  return result.items
}

export async function createCashFlow(data: CreateCashFlowData): Promise<CashFlow> {
  return apiClient.post<CashFlow>("/api/cash-flows", data)
}

export async function updateCashFlow(id: string, data: UpdateCashFlowData): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>(`/api/cash-flows/${id}`, data)
}

export async function deleteCashFlow(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/api/cash-flows/${id}`)
}

