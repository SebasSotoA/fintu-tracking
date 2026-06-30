import { apiClient } from "./client"

export interface Plan {
  id: string
  name: string
  description?: string | null
  tier: "free" | "pro" | "enterprise" | "closed_beta"
  price_monthly_usd?: string | null
  price_annual_usd?: string | null
  currency: string
  features: Record<string, unknown>
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired"
  billing_provider: "manual" | "wompi" | "mercadopago" | "stripe"
  provider_subscription_id?: string | null
  trial_start?: string | null
  trial_end?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end: boolean
  plan?: Plan
  created_at: string
  updated_at: string
}

export interface CreateSubscriptionData {
  plan_id: string
  billing_provider: string
}

export function listPlans(): Promise<Plan[]> {
  return apiClient.get<Plan[]>("/api/plans")
}

export function getCurrentSubscription(): Promise<Subscription> {
  return apiClient.get<Subscription>("/api/subscriptions/current")
}

export function createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
  return apiClient.post<Subscription>("/api/subscriptions", data)
}

export function cancelSubscription(id: string): Promise<Subscription> {
  return apiClient.patch<Subscription>(`/api/subscriptions/${id}/cancel`, {})
}
