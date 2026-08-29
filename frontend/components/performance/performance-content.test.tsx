import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import type { NetWorthData } from "@/lib/types"
import { PerformanceContent } from "./performance-content"

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
}))

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    return function MockDynamic() {
      const name = loader.toString()
      if (name.includes("portfolio-performance-chart")) {
        return <div data-testid="portfolio-performance-chart" />
      }
      return null
    }
  },
}))

vi.mock("./performance-insight-strip", () => ({
  PerformanceInsightStrip: () => <div data-testid="performance-insight-strip" />,
}))

vi.mock("./performance-now-card", () => ({
  PerformanceNowCard: () => <div data-testid="performance-now-card" />,
}))

vi.mock("./fees-breakdown", () => ({
  FeesBreakdown: () => <div data-testid="fees-breakdown" />,
}))

vi.mock("./fx-impact-card", () => ({
  FxImpactCard: () => <div data-testid="fx-impact-card" />,
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
  it("renders insight strip, now card + chart, then fees + fx", () => {
    const { container } = render(<PerformanceContent netWorth={netWorth} />)
    expect(sectionTestIds(container)).toEqual([
      "performance-insight-strip",
      "performance-now-card",
      "portfolio-performance-chart",
      "fees-breakdown",
      "fx-impact-card",
    ])
    expect(container.querySelector("[data-testid='performance-summary']")).toBeNull()
  })
})
