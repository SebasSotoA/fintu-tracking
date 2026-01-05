import { apiClient } from "./client"
import type { CashFlow } from "@/lib/types"

export interface CreateCashFlowData {
  date: string
  type: "deposit" | "withdrawal" | "fee"
  currency: "COP" | "USD"
  amount: string
  fx_rate?: string | null
  notes?: string | null
}

export interface UpdateCashFlowData {
  date?: string
  type?: "deposit" | "withdrawal" | "fee"
  currency?: "COP" | "USD"
  amount?: string
  fx_rate?: string | null
  notes?: string | null
}

export async function listCashFlows(): Promise<CashFlow[]> {
  return apiClient.get<CashFlow[]>("/api/cash-flows")
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

