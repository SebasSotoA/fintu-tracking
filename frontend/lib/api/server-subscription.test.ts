import { describe, it, expect, vi, beforeEach } from "vitest"
import { serverListPlans, serverGetCurrentSubscription } from "./server-subscription"
import { serverGet } from "./server-client"

vi.mock("./server-client", () => ({
  serverGet: vi.fn(),
}))

describe("server subscription API", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("serverListPlans fetches /api/plans", async () => {
    const plans = [{ id: "free", name: "Free", tier: "free", currency: "USD", features: {}, is_public: true, created_at: "", updated_at: "" }]
    vi.mocked(serverGet).mockResolvedValueOnce(plans)

    const result = await serverListPlans()

    expect(serverGet).toHaveBeenCalledWith("/api/plans")
    expect(result).toEqual(plans)
  })

  it("serverGetCurrentSubscription fetches /api/subscriptions/current", async () => {
    const subscription = { id: "sub-1", user_id: "user-1", plan_id: "closed_beta", status: "active", billing_provider: "manual", cancel_at_period_end: false, created_at: "", updated_at: "" }
    vi.mocked(serverGet).mockResolvedValueOnce(subscription)

    const result = await serverGetCurrentSubscription()

    expect(serverGet).toHaveBeenCalledWith("/api/subscriptions/current")
    expect(result).toEqual(subscription)
  })
})
