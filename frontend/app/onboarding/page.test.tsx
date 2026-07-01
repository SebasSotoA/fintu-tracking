import { describe, expect, it, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockRedirect = vi.fn()

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

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
  })

  it("redirects unauthenticated users to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { default: OnboardingPage } = await import("./page")

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT:/auth/login")
    expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
  })

  it("redirects authenticated users to dashboard", async () => {
    const { default: OnboardingPage } = await import("./page")

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })
})
