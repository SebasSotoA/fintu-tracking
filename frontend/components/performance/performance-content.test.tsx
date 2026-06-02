import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { CashFlow, NetWorthData } from "@/lib/types"
import { PerformanceContent } from "./performance-content"

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    return function MockDynamic(props: Record<string, unknown>) {
      const name = loader.toString()
      if (name.includes("portfolio-performance-chart")) {
        return <div data-testid="portfolio-performance-chart" />
      }
      if (name.includes("return-attribution")) {
        return <div data-testid="return-attribution" />
      }
      if (name.includes("fee-attribution-chart")) {
        return <div data-testid="fee-attribution-chart" />
      }
      if (name.includes("fee-efficiency-table")) {
        return <div data-testid="fee-efficiency-table" />
      }
      if (name.includes("performance-charts")) {
        return (
          <div data-testid="performance-charts">
            flows:{(props.cashFlows as CashFlow[] | undefined)?.length ?? 0}
          </div>
        )
      }
      return null
    }
  },
}))

vi.mock("./performance-hero", () => ({
  PerformanceHero: ({ cashFlows }: { cashFlows: CashFlow[] }) => (
    <div data-testid="performance-hero">flows:{cashFlows.length}</div>
  ),
}))

const netWorth: NetWorthData = {
  holdings_value: "0",
  cash_balance: "100",
  net_worth: "100",
  total_invested: "100",
  total_fees: "0",
  total_gain_loss: "0",
  total_gain_loss_pct: "0",
  xirr: "0",
  breakdown: { by_asset_type: {}, by_ticker: {} },
}

const cashFlow: CashFlow = {
  id: "cf-1",
  user_id: "u1",
  type: "deposit",
  amount: "100",
  currency: "USD",
  fx_rate: null,
  usd_amount: "100.00",
  date: "2024-01-01",
  notes: null,
  fee_type: null,
  related_trade_id: null,
  related_cash_flow_id: null,
  related_type: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

function sectionTestIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-testid]")).map(
    (el) => el.getAttribute("data-testid") ?? "",
  )
}

describe("PerformanceContent", () => {
  it("passes server-fetched cash flows to hero and charts", () => {
    const { container } = render(
      <PerformanceContent netWorth={netWorth} cashFlows={[cashFlow]} />,
    )
    expect(screen.getByTestId("performance-hero")).toHaveTextContent("flows:1")
    expect(screen.getByTestId("performance-charts")).toHaveTextContent("flows:1")
    expect(sectionTestIds(container)).toEqual([
      "performance-hero",
      "portfolio-performance-chart",
      "return-attribution",
      "fee-attribution-chart",
      "fee-efficiency-table",
      "performance-charts",
    ])
  })

  it("does not render legacy performance metrics grid", () => {
    render(
      <PerformanceContent netWorth={netWorth} cashFlows={[]} />,
    )
    expect(screen.queryByText("XIRR (USD)")).not.toBeInTheDocument()
    expect(screen.queryByText("Portfolio Value")).not.toBeInTheDocument()
  })
})
