import { serverGet } from "./server-client"
import type { Plan, Subscription } from "./subscription"

export function serverListPlans(): Promise<Plan[]> {
  return serverGet<Plan[]>("/api/plans")
}

export function serverGetCurrentSubscription(): Promise<Subscription> {
  return serverGet<Subscription>("/api/subscriptions/current")
}
