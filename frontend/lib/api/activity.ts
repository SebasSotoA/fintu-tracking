import { apiClient } from "./client"

export interface ActivityItem {
  id: string
  date: string
  kind: "trade" | "deposit" | "withdrawal" | "fee" | "cash_adjustment"
  sub_kind: string
  ticker: string
  direction: "in" | "out"
  amount_usd: string
  details: string
}

export async function getActivityFeed(limit = 8): Promise<ActivityItem[]> {
  return apiClient.get<ActivityItem[]>(`/api/activity/feed?limit=${limit}`)
}
