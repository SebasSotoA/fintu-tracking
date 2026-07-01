import { describe, expect, it, vi, beforeEach } from "vitest"
import { ApiError } from "@/lib/api/server-client"
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

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children, initialProfile }: { children: React.ReactNode; initialProfile?: Profile }) => (
    <div data-testid="app-shell" data-profile={initialProfile?.id}>{children}</div>
  ),
}))

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "co",
  broker_preset_id: "hapi-colombia",
  onboarding_completed: true,
  onboarding_step: "done",
  subscription_status: "active",
  created_at: "",
  updated_at: "",
}

describe("AppLayout", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    mockHandleServerAuthError.mockImplementation(() => {
      throw new Error("AUTH_REDIRECT")
    })
  })

  it("redirects to subscription when /api/me fails with a server error", async () => {
    mockServerGet.mockRejectedValue(new ApiError("Internal server error", 500))

    const { default: AppLayout } = await import("./layout")

    await expect(AppLayout({ children: <div>child</div> })).rejects.toThrow(
      "NEXT_REDIRECT:/subscription",
    )
    expect(mockRedirect).toHaveBeenCalledWith("/subscription")
  })

  it("redirects to subscription when /api/me fails with a network error", async () => {
    mockServerGet.mockRejectedValue(new Error("fetch failed"))

    const { default: AppLayout } = await import("./layout")

    await expect(AppLayout({ children: <div>child</div> })).rejects.toThrow(
      "NEXT_REDIRECT:/subscription",
    )
    expect(mockRedirect).toHaveBeenCalledWith("/subscription")
  })

  it("renders children when profile loads successfully", async () => {
    mockServerGet.mockResolvedValue(baseProfile)

    const { default: AppLayout } = await import("./layout")
    const result = await AppLayout({ children: <div data-testid="child">child</div> })

    expect(result).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("renders children when onboarding is incomplete", async () => {
    mockServerGet.mockResolvedValue({
      ...baseProfile,
      onboarding_completed: false,
      subscription_status: "canceled",
    })

    const { default: AppLayout } = await import("./layout")
    const result = await AppLayout({ children: <div>child</div> })

    expect(result).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("redirects to subscription when onboarding is complete but subscription is inactive", async () => {
    mockServerGet.mockResolvedValue({
      ...baseProfile,
      onboarding_completed: true,
      subscription_status: "canceled",
    })

    const { default: AppLayout } = await import("./layout")

    await expect(AppLayout({ children: <div>child</div> })).rejects.toThrow(
      "NEXT_REDIRECT:/subscription",
    )
    expect(mockRedirect).toHaveBeenCalledWith("/subscription")
  })
})
