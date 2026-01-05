import { apiClient } from "./client"
import type { FxRate } from "@/lib/types"

export interface CreateFxRateData {
  date: string
  rate: string
  source: string
}

export interface UpdateFxRateData {
  date?: string
  rate?: string
  source?: string
}

export async function listFxRates(): Promise<FxRate[]> {
  return apiClient.get<FxRate[]>("/api/fx-rates")
}

export async function createFxRate(data: CreateFxRateData): Promise<FxRate> {
  return apiClient.post<FxRate>("/api/fx-rates", data)
}

export async function updateFxRate(id: string, data: UpdateFxRateData): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>(`/api/fx-rates/${id}`, data)
}

export async function deleteFxRate(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/api/fx-rates/${id}`)
}

