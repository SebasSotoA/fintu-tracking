import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CashFlow } from "@/lib/types"
import { FeesBreakdown } from "./fees-breakdown"

function cashFlow(overrides: Partial<CashFlow>): CashFlow {
  return {
    id: "cf-1",
    user_id: "u1",
    date: "2026-06-01",
    type: "fee",
    currency: "USD",
    amount: "1.99",
    fx_rate: null,
    usd_amount: "1.99",
    broker_id: null,
    notes: null,
    fee_type: null,
    related_trade_id: null,
    related_cash_flow_id: null,
    related_type: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

describe("FeesBreakdown", () => {
  it("shows transfer and trading fees in separate tabs", async () => {
    const user = userEvent.setup()
    render(
      <FeesBreakdown
        cashFlows={[
          cashFlow({ id: "f1", usd_amount: "1.99", related_type: "deposit" }),
          cashFlow({ id: "f2", usd_amount: "2.50", related_type: "trade" }),
        ]}
      />,
    )

    expect(screen.getByText("$1.99")).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Trading fees" }))
    expect(screen.getByText("$2.50")).toBeInTheDocument()
  })

  it("shows warning when standalone fees exist", () => {
    render(<FeesBreakdown cashFlows={[cashFlow({ related_type: "standalone" })]} />)
    expect(screen.getByText(/unlinked fee row/i)).toBeInTheDocument()
  })
})
