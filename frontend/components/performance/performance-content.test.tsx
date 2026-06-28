import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { CashFlow, NetWorthData } from "@/lib/types"
import { PerformanceContent } from "./performance-content"

const mockCashFlows: CashFlow[] = [
  {
    id: "cf-1",
    user_id: "u1",
    type: "deposit",
    amount: "100",
    currency: "USD",
    fx_rate: null,
    usd_amount: "100.00",
    broker_id: null,
    date: "2024-01-01",
    notes: null,
    fee_type: null,
    related_trade_id: null,
    related_cash_flow_id: null,
    related_type: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
]

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockCashFlows }),
}))

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

vi.mock("./fees-breakdown", () => ({
  FeesBreakdown: ({ cashFlows }: { cashFlows: CashFlow[] }) => (
    <div data-testid="fees-breakdown">flows:{cashFlows.length}</div>
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

function sectionTestIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-testid]")).map(
    (el) => el.getAttribute("data-testid") ?? "",
  )
}

describe("PerformanceContent", () => {
  it("loads cash flows via TanStack Query for hero and charts", () => {
    const { container } = render(<PerformanceContent netWorth={netWorth} />)
    expect(screen.getByTestId("performance-hero")).toHaveTextContent("flows:1")
    expect(screen.getByTestId("performance-charts")).toHaveTextContent("flows:1")
    expect(sectionTestIds(container)).toEqual([
      "performance-hero",
      "portfolio-performance-chart",
      "return-attribution",
      "fees-breakdown",
      "performance-charts",
    ])
  })

  it("does not render legacy performance metrics grid", () => {
    render(<PerformanceContent netWorth={netWorth} />)
    expect(screen.queryByText("XIRR (USD)")).not.toBeInTheDocument()
    expect(screen.queryByText("Portfolio Value")).not.toBeInTheDocument()
  })
})
