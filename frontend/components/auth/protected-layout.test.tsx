import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ApiError } from "@/lib/api/client"
import type { Profile } from "@/lib/api/me"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import { ProtectedLayout } from "./protected-layout"

const mockReplace = vi.fn()
const mockGetUser = vi.fn()
const mockGetMe = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

vi.mock("@/lib/api/me", () => ({
  getMe: () => mockGetMe(),
}))

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children, initialProfile }: { children: ReactNode; initialProfile?: Profile }) => (
    <div data-testid="app-shell" data-profile={initialProfile?.id}>
      {children}
    </div>
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

function renderProtectedLayout(requireActiveSubscription = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>
        <ProtectedLayout requireActiveSubscription={requireActiveSubscription}>
          <div data-testid="child">child</div>
        </ProtectedLayout>
      </QueryClientProvider>
    </EnglishLocaleWrapper>,
  )
}

describe("ProtectedLayout", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    mockGetMe.mockResolvedValue(baseProfile)
  })

  it("redirects to login when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    renderProtectedLayout()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login")
    })
  })

  it("renders children when profile loads successfully", async () => {
    renderProtectedLayout()

    expect(await screen.findByTestId("child")).toBeInTheDocument()
    expect(screen.getByTestId("app-shell")).toHaveAttribute("data-profile", "profile-1")
  })

  it("redirects to subscription when onboarding is complete but subscription is inactive", async () => {
    mockGetMe.mockResolvedValue({
      ...baseProfile,
      subscription_status: "canceled",
    })

    renderProtectedLayout()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/subscription")
    })
  })

  it("redirects to login when profile fetch returns 401", async () => {
    mockGetMe.mockRejectedValue(new ApiError("Unauthorized", 401))

    renderProtectedLayout()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login")
    })
  })

  it("skips subscription redirect when requireActiveSubscription is false", async () => {
    mockGetMe.mockResolvedValue({
      ...baseProfile,
      subscription_status: "canceled",
    })

    renderProtectedLayout(false)

    expect(await screen.findByTestId("child")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalledWith("/subscription")
  })
})
