import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AssetAllocationCard } from "./asset-allocation-card"
import type { NetWorthData } from "@/lib/types"

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children: _children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{_children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => null,
}))

const baseData: NetWorthData = {
  holdings_value: "1000",
  cash_balance: "200",
  net_worth: "1200",
  total_invested: "1000",
  total_fees: "0",
  total_gain_loss: "0",
  total_gain_loss_pct: "0",
  xirr: "0",
  breakdown: {
    by_asset_type: { stock: "650", etf: "200", crypto: "100", cash: "50" },
    by_ticker: {},
  },
}

describe("AssetAllocationCard", () => {
  it("renders the asset allocation title", () => {
    render(<AssetAllocationCard data={baseData} />)
    expect(screen.getByText("Asset Allocation")).toBeInTheDocument()
  })

  it("renders a slice label for each non-zero asset type", () => {
    render(<AssetAllocationCard data={baseData} />)
    expect(screen.getByText("Stocks")).toBeInTheDocument()
    expect(screen.getByText("ETFs")).toBeInTheDocument()
    expect(screen.getByText("Crypto")).toBeInTheDocument()
    expect(screen.getByText("Cash")).toBeInTheDocument()
  })

  it("renders percentages next to each label", () => {
    render(<AssetAllocationCard data={baseData} />)
    // 65, 20, 10, 5 (rounded)
    expect(screen.getByText("65%")).toBeInTheDocument()
    expect(screen.getByText("20%")).toBeInTheDocument()
    expect(screen.getByText("10%")).toBeInTheDocument()
    expect(screen.getByText("5%")).toBeInTheDocument()
  })

  it("renders an empty state when there is no allocation data", () => {
    render(
      <AssetAllocationCard
        data={{ ...baseData, breakdown: { by_asset_type: {}, by_ticker: {} } }}
      />,
    )
    expect(screen.getByText(/add holdings to see your allocation/i)).toBeInTheDocument()
  })
})