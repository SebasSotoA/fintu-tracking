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

export interface CurrentRateResponse {
  rate: string
  date: string
  source: string
  from: string
  to: string
}

export interface FetchCurrentRateParams {
  from?: string
  to?: string
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

/**
 * Fetches the current exchange rate from the backend.
 * Defaults to USD→COP. Pass { from: "COP", to: "USD" } for the inverse.
 * The backend applies a two-layer cache (in-memory → Postgres) before
 * hitting ExchangeRate-API, so the inverse is computed from the cached
 * base rate with no extra API call.
 */
export async function fetchCurrentRate(params?: FetchCurrentRateParams): Promise<CurrentRateResponse> {
  const query = new URLSearchParams()
  if (params?.from) query.set("from", params.from)
  if (params?.to) query.set("to", params.to)
  const qs = query.toString()
  return apiClient.get<CurrentRateResponse>(`/api/fx-rates/current${qs ? `?${qs}` : ""}`)
}

