import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  listPlans,
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
} from "./subscription"
import { apiClient } from "./client"

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

describe("subscription API", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("listPlans fetches /api/plans", async () => {
    const plans = [{ id: "free", name: "Free", tier: "free", currency: "USD", features: {}, is_public: true, created_at: "", updated_at: "" }]

    vi.mocked(apiClient.get).mockResolvedValueOnce(plans)

    const result = await listPlans()

    expect(apiClient.get).toHaveBeenCalledWith("/api/plans")
    expect(result).toEqual(plans)
  })

  it("getCurrentSubscription fetches /api/subscriptions/current", async () => {
    const subscription = { id: "sub-1", user_id: "user-1", plan_id: "closed_beta", status: "active", billing_provider: "manual", cancel_at_period_end: false, created_at: "", updated_at: "" }
    vi.mocked(apiClient.get).mockResolvedValueOnce(subscription)

    const result = await getCurrentSubscription()

    expect(apiClient.get).toHaveBeenCalledWith("/api/subscriptions/current")
    expect(result).toEqual(subscription)
  })

  it("createSubscription posts to /api/subscriptions", async () => {
    const data = { plan_id: "pro_monthly", billing_provider: "manual" }
    const subscription = { id: "sub-2", user_id: "user-1", plan_id: "pro_monthly", status: "active", billing_provider: "manual", cancel_at_period_end: false, created_at: "", updated_at: "" }
    vi.mocked(apiClient.post).mockResolvedValueOnce(subscription)

    const result = await createSubscription(data)

    expect(apiClient.post).toHaveBeenCalledWith("/api/subscriptions", data)
    expect(result).toEqual(subscription)
  })

  it("cancelSubscription patches /api/subscriptions/:id/cancel", async () => {
    const subscription = { id: "sub-1", user_id: "user-1", plan_id: "closed_beta", status: "canceled", billing_provider: "manual", cancel_at_period_end: true, created_at: "", updated_at: "" }
    vi.mocked(apiClient.patch).mockResolvedValueOnce(subscription)

    const result = await cancelSubscription("sub-1")

    expect(apiClient.patch).toHaveBeenCalledWith("/api/subscriptions/sub-1/cancel", {})
    expect(result).toEqual(subscription)
  })
})
