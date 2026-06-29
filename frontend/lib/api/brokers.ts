import { apiClient } from "./client"
import type { BrokerPreset } from "@/lib/brokers/broker-presets"

export interface Broker {
  id: string
  user_id: string
  preset_id: string
  name: string
  country: string
  base_currency: string
  local_currency: string
  deposit_fee_type: string
  deposit_fee_value: string
  withdrawal_fee_type: string
  withdrawal_fee_value: string
  created_at: string
  updated_at: string
}

export interface ListBrokersResponse {
  brokers: Broker[]
  presets: BrokerPreset[]
}

export async function listBrokers(): Promise<ListBrokersResponse> {
  return apiClient.get<ListBrokersResponse>("/api/brokers")
}

export interface CreateBrokerData {
  preset_id: string
}

export async function createBroker(data: CreateBrokerData): Promise<Broker> {
  return apiClient.post<Broker>("/api/brokers", data)
}
