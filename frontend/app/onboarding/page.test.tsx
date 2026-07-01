import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Profile } from "@/lib/api/me"

const mockGetUser = vi.fn()
const mockRedirect = vi.fn()
const mockServerGet = vi.fn()
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

vi.mock("@/components/onboarding/onboarding-wizard", () => ({
  OnboardingWizard: () => <div>OnboardingWizard</div>,
}))

const completedProfile = (subscriptionStatus: string): Profile => ({
  id: "profile-1",
  user_id: "user-1",
  country: "co",
  broker_preset_id: "hapi-colombia",
  onboarding_completed: true,
  onboarding_step: "done",
  subscription_status: subscriptionStatus,
  created_at: "",
  updated_at: "",
})

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    mockHandleServerAuthError.mockImplementation(() => {
      throw new Error("AUTH_REDIRECT")
    })
  })

  it("redirects to dashboard when onboarding is complete and subscription is active", async () => {
    mockServerGet.mockResolvedValue(completedProfile("active"))

    const { default: OnboardingPage } = await import("./page")

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to subscription when onboarding is complete but subscription is canceled", async () => {
    mockServerGet.mockResolvedValue(completedProfile("canceled"))

    const { default: OnboardingPage } = await import("./page")

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT:/subscription")
    expect(mockRedirect).toHaveBeenCalledWith("/subscription")
  })
})
