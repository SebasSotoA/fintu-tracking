import { apiClient } from "./client"
import type { Trade } from "@/lib/types"

export interface CreateTradeData {
  date: string
  ticker: string
  asset_type: "stock" | "etf"
  side: "buy" | "sell"
  quantity: string
  price: string
  fee: string
  notes?: string | null
}

export interface UpdateTradeData {
  date?: string
  ticker?: string
  asset_type?: "stock" | "etf"
  side?: "buy" | "sell"
  quantity?: string
  price?: string
  fee?: string
  notes?: string | null
}

export async function listTrades(): Promise<Trade[]> {
  return apiClient.get<Trade[]>("/api/trades")
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

