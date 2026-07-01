import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PlanPicker } from "./plan-picker"
import type { Plan } from "@/lib/api/subscription"

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "pro_monthly",
    name: "Pro",
    tier: "pro",
    currency: "USD",
    features: {},
    is_public: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

describe("PlanPicker", () => {
  it("renders empty state when no plans are provided", () => {
    render(<PlanPicker plans={[]} currentPlanId="free" />)
    expect(screen.getByText("No plans available.")).toBeInTheDocument()
  })

  it("renders plan names and prices", () => {
    const plans = [
      makePlan({ id: "free", name: "Free", tier: "free" }),
      makePlan({ id: "pro", name: "Pro Monthly", tier: "pro", price_monthly_usd: "9" }),
    ]
    render(<PlanPicker plans={plans} currentPlanId="free" />)

    expect(screen.getAllByText("Free").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument()
    expect(screen.getByText("$9/mo")).toBeInTheDocument()
  })

  it("shows annual price when monthly is missing", () => {
    const plans = [makePlan({ id: "pro_annual", name: "Pro Annual", tier: "pro", price_annual_usd: "90" })]
    render(<PlanPicker plans={plans} currentPlanId="pro_annual" />)

    expect(screen.getByText("$90/yr")).toBeInTheDocument()
  })

  it("marks the current plan with a badge", () => {
    const plans = [
      makePlan({ id: "free", name: "Free", tier: "free" }),
      makePlan({ id: "pro", name: "Pro", tier: "pro", price_monthly_usd: "9" }),
    ]
    render(<PlanPicker plans={plans} currentPlanId="free" />)

    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("renders feature bullets", () => {
    const plans = [
      makePlan({
        id: "pro",
        name: "Pro",
        tier: "pro",
        price_monthly_usd: "9",
        features: { max_trades: 100, supports_exports: true },
      }),
    ]
    render(<PlanPicker plans={plans} currentPlanId="pro" />)

    expect(screen.getByText("Up to 100 trades")).toBeInTheDocument()
    expect(screen.getByText("CSV/PDF exports")).toBeInTheDocument()
  })

  it("renders the plan description", () => {
    const plans = [makePlan({ id: "free", name: "Free", tier: "free", description: "Basic plan for getting started" })]
    render(<PlanPicker plans={plans} currentPlanId="free" />)

    expect(screen.getByText("Basic plan for getting started")).toBeInTheDocument()
  })

  it("shows enabled Reactivate button for canceled current plan", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const plans = [makePlan({ id: "pro", name: "Pro", tier: "pro", price_monthly_usd: "9" })]

    render(
      <PlanPicker
        plans={plans}
        currentPlanId="pro"
        subscriptionStatus="canceled"
        onSelect={onSelect}
      />,
    )

    const reactivateButton = screen.getByRole("button", { name: "Reactivate" })
    expect(reactivateButton).toBeEnabled()

    await user.click(reactivateButton)
    expect(onSelect).toHaveBeenCalledWith(plans[0])
  })

  it("shows disabled Current plan for active current plan", () => {
    const plans = [makePlan({ id: "pro", name: "Pro", tier: "pro", price_monthly_usd: "9" })]

    render(
      <PlanPicker
        plans={plans}
        currentPlanId="pro"
        subscriptionStatus="active"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Reactivate" })).not.toBeInTheDocument()
  })
})
