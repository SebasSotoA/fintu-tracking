import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ApiError } from "@/lib/api/client"
import type { Profile } from "@/lib/api/me"
import SubscriptionPageClient from "./page"

const mockReplace = vi.fn()
const mockGetUser = vi.fn()
const mockGetMe = vi.fn()
const mockListPlans = vi.fn()
const mockGetCurrentSubscription = vi.fn()

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

vi.mock("@/lib/api/subscription", () => ({
  listPlans: () => mockListPlans(),
  getCurrentSubscription: () => mockGetCurrentSubscription(),
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SubscriptionPageClient />
    </QueryClientProvider>,
  )
}

describe("SubscriptionPageClient", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    mockGetMe.mockResolvedValue(baseProfile)
    mockListPlans.mockResolvedValue([])
    mockGetCurrentSubscription.mockResolvedValue(null)
  })

  it("renders SubscriptionPage when profile and plans load", async () => {
    renderPage()
    expect(await screen.findByText("SubscriptionPage")).toBeInTheDocument()
  })

  it("redirects to dashboard when subscription is active", async () => {
    mockGetMe.mockResolvedValue({
      ...baseProfile,
      subscription_status: "active",
    })

    renderPage()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })

  it("handles 404 subscription as null", async () => {
    mockGetCurrentSubscription.mockRejectedValue(new ApiError("Not found", 404))

    renderPage()
    expect(await screen.findByText("SubscriptionPage")).toBeInTheDocument()
  })
})
