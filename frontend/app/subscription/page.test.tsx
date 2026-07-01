import { describe, expect, it, vi, beforeEach } from "vitest"
import { ApiError } from "@/lib/api/server-client"
import type { Profile } from "@/lib/api/me"

const mockGetUser = vi.fn()
const mockRedirect = vi.fn()
const mockServerGet = vi.fn()
const mockServerListPlans = vi.fn()
const mockServerGetCurrentSubscription = vi.fn()
const mockHandleServerAuthError = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock("@/lib/api/server-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/server-client")>()
  return {
    ...original,
    serverGet: (endpoint: string) => mockServerGet(endpoint),
    handleServerAuthError: (error: unknown) => mockHandleServerAuthError(error),
  }
})

vi.mock("@/lib/api/server-subscription", () => ({
  serverListPlans: () => mockServerListPlans(),
  serverGetCurrentSubscription: () => mockServerGetCurrentSubscription(),
}))

vi.mock("@/components/subscription/subscription-page", () => ({
  SubscriptionPage: () => <div>SubscriptionPage</div>,
}))

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "co",
  broker_preset_id: "hapi-colombia",
  onboarding_completed: true,
  onboarding_step: "done",
  subscription_status: "canceled",
  created_at: "",
  updated_at: "",
}

describe("SubscriptionPageServer", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    mockServerGet.mockResolvedValue(baseProfile)
    mockServerListPlans.mockResolvedValue([])
    mockServerGetCurrentSubscription.mockResolvedValue(null)
    mockHandleServerAuthError.mockImplementation(() => {
      throw new Error("AUTH_REDIRECT")
    })
  })

  it("uses isApiError path for plan fetch auth failures", async () => {
    const plansError = new ApiError("Forbidden", 403)
    mockServerListPlans.mockRejectedValue(plansError)

    const { default: SubscriptionPageServer } = await import("./page")

    await expect(SubscriptionPageServer()).rejects.toThrow("AUTH_REDIRECT")
    expect(mockHandleServerAuthError).toHaveBeenCalledWith(plansError)
  })

  it("uses isApiError path for subscription fetch non-404 failures", async () => {
    const subscriptionError = new ApiError("Forbidden", 403)
    mockServerGetCurrentSubscription.mockRejectedValue(subscriptionError)

    const { default: SubscriptionPageServer } = await import("./page")

    await expect(SubscriptionPageServer()).rejects.toThrow("AUTH_REDIRECT")
    expect(mockHandleServerAuthError).toHaveBeenCalledWith(subscriptionError)
  })
})
