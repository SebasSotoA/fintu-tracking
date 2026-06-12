import { apiClient } from "./client"
import type { PaginatedResult } from "./pagination"
import type { CashFlow } from "@/lib/types"
import { EXPORT_PAGE_SIZE } from "@/lib/pagination/table-pagination"

export interface CreateCashFlowData {
  date: string
  type: "deposit" | "withdrawal" | "fee" | "cash_adjustment"
  currency: "COP" | "USD"
  amount: string
  fx_rate?: string | null
  notes?: string | null
  fee_type?: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal" | null
  related_trade_id?: string | null
  related_cash_flow_id?: string | null
  related_type?: "trade" | "deposit" | "withdrawal" | "standalone" | null
}

export interface UpdateCashFlowData {
  date?: string
  type?: "deposit" | "withdrawal" | "fee" | "cash_adjustment"
  currency?: "COP" | "USD"
  amount?: string
  fx_rate?: string | null
  notes?: string | null
  fee_type?: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal" | null
  related_trade_id?: string | null
  related_cash_flow_id?: string | null
  related_type?: "trade" | "deposit" | "withdrawal" | "standalone" | null
}

export async function listCashFlows(): Promise<CashFlow[]> {
  return apiClient.get<CashFlow[]>("/api/cash-flows")
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

