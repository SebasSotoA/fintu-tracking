import { describe, expect, it, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { SubscriptionPage } from "./subscription-page"
import type { Plan, Subscription } from "@/lib/api/subscription"

const mockCreateSubscription = vi.fn()
const mockCancelSubscription = vi.fn()

vi.mock("@/lib/api/subscription", () => ({
  createSubscription: (...args: unknown[]) => mockCreateSubscription(...args),
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
  billingProvider: "manual",
}))

vi.mock("@/lib/toast", () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tier: "free",
    currency: "USD",
    features: {},
    is_public: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "pro",
    name: "Pro",
    tier: "pro",
    currency: "USD",
    price_monthly_usd: "9",
    features: {},
    is_public: true,
    created_at: "",
    updated_at: "",
  },
]

const subscription: Subscription = {
  id: "sub-1",
  user_id: "user-1",
  plan_id: "free",
  status: "active",
  billing_provider: "manual",
  cancel_at_period_end: false,
  created_at: "",
  updated_at: "",
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <SubscriptionPage plans={plans} subscription={subscription} />
    </QueryClientProvider>,
  )
}

describe("SubscriptionPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCreateSubscription.mockReturnValue(new Promise(() => {}))
  })

  it("shows a plan picker skeleton while creating a subscription", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: "Choose plan" }))

    const status = await screen.findByRole("status", { name: "Updating to Pro…" })
    expect(status.querySelector("[data-slot='skeleton']")).not.toBeNull()
    expect(screen.getByTestId("plan-picker-skeleton")).toBeInTheDocument()
    expect(document.querySelector(".animate-spin")).toBeNull()
  })
})
