import { apiClient } from "./client"

export interface Profile {
  id: string
  user_id: string
  country: string
  broker_preset_id: string | null
  onboarding_completed: boolean
  onboarding_step: string
  plan_id?: string | null
  subscription_status?: string | null
  created_at: string
  updated_at: string
}

export interface UpdateOnboardingData {
  country: string
  broker_preset_id: string
}

export async function getMe(): Promise<Profile> {
  return apiClient.get<Profile>("/api/me")
}

export async function updateOnboarding(data: UpdateOnboardingData): Promise<Profile> {
  return apiClient.patch<Profile>("/api/me/onboarding", data)
}
