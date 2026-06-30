import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SubscriptionStatusCard } from "./subscription-status-card"
import type { Subscription } from "@/lib/api/subscription"

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    user_id: "user-1",
    plan_id: "closed_beta",
    status: "active",
    billing_provider: "manual",
    cancel_at_period_end: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

describe("SubscriptionStatusCard", () => {
  it("renders the plan name from the nested plan object", () => {
    const subscription = makeSubscription({
      plan: { id: "closed_beta", name: "Closed Beta", tier: "closed_beta", currency: "USD", features: {}, is_public: true, created_at: "", updated_at: "" },
    })
    render(<SubscriptionStatusCard subscription={subscription} />)

    expect(screen.getByText("Closed Beta")).toBeInTheDocument()
  })

  it("falls back to plan_id when no nested plan", () => {
    const subscription = makeSubscription()
    render(<SubscriptionStatusCard subscription={subscription} />)

    expect(screen.getByText("closed_beta")).toBeInTheDocument()
  })

  it("renders an active label", () => {
    render(<SubscriptionStatusCard subscription={makeSubscription({ status: "active" })} />)

    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("renders a trialing label", () => {
    render(<SubscriptionStatusCard subscription={makeSubscription({ status: "trialing" })} />)

    expect(screen.getByText("Trialing")).toBeInTheDocument()
  })

  it("renders a canceled label and renewal message", () => {
    render(<SubscriptionStatusCard subscription={makeSubscription({ status: "canceled" })} />)

    expect(screen.getByText("Canceled")).toBeInTheDocument()
    expect(
      screen.getByText("Your subscription has been canceled. Renew to regain full access."),
    ).toBeInTheDocument()
  })

  it("renders a past due label and payment message", () => {
    render(<SubscriptionStatusCard subscription={makeSubscription({ status: "past_due" })} />)

    expect(screen.getByText("Past due")).toBeInTheDocument()
    expect(
      screen.getByText("Your subscription is past due. Update your payment method to restore access."),
    ).toBeInTheDocument()
  })

  it("renders the closed beta message for active subscriptions", () => {
    render(<SubscriptionStatusCard subscription={makeSubscription({ status: "active" })} />)

    expect(
      screen.getByText("Your closed-beta subscription is active. Enjoy unlimited tracking while we prepare paid plans."),
    ).toBeInTheDocument()
  })
})
