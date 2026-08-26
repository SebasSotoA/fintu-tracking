import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { PerformanceSummaryCard } from "./performance-summary-card"

const mockGetNetWorth = vi.fn()
const mockGetReturnAttribution = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getNetWorth: (...args: unknown[]) => mockGetNetWorth(...args),
  getReturnAttribution: (...args: unknown[]) => mockGetReturnAttribution(...args),
}))

const baseNetWorth: NetWorthData = {
  holdings_value: "10000.00",
  cash_balance: "2000.00",
  net_worth: "12000.00",
  total_invested: "10000.00",
  total_fees: "150.00",
  total_gain_loss: "2000.00",
  total_gain_loss_pct: "20.00",
  xirr: "0",
  breakdown: { by_asset_type: {}, by_ticker: {} },
}

const baseAttribution = {
  starting_capital: "10000.00",
  market_gains: "2150.00",
  market_gains_pct: "21.50",
  deposit_fees_impact: "100.00",
  trading_fees_impact: "50.00",
  closing_fees_impact: "0.00",
  total_fees_impact: "150.00",
  total_fees_impact_pct: "1.50",
  fx_impact: "0.00",
  fx_impact_pct: "0.00",
  net_position: "12000.00",
  net_return_pct: "20.00",
}

function renderCard(netWorth: NetWorthData = baseNetWorth) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PerformanceSummaryCard initialNetWorth={netWorth} />
    </QueryClientProvider>,
  )
}

describe("PerformanceSummaryCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNetWorth.mockResolvedValue(baseNetWorth)
    mockGetReturnAttribution.mockResolvedValue(baseAttribution)
  })

  it("shows 'You're up' headline with gain amount", async () => {
    renderCard()
    expect(await screen.findByText(/You're up/)).toBeInTheDocument()
    expect(screen.getByText(/\$2,000\.00/)).toBeInTheDocument()
  })

  it("shows gain percent vs previous period", async () => {
    renderCard()
    expect(await screen.findByText(/20\.00%/)).toBeInTheDocument()
    expect(screen.getByText(/vs previous period/)).toBeInTheDocument()
  })

  it("shows breakdown rows: invested, gains, fees, current value", async () => {
    renderCard()
    expect(await screen.findByText("Total invested")).toBeInTheDocument()
    expect(screen.getByText("Market gains")).toBeInTheDocument()
    expect(screen.getByText("Fees paid")).toBeInTheDocument()
    expect(screen.getByText("What you have now")).toBeInTheDocument()
  })

  it("shows 'You're down' for negative gains", async () => {
    const negative = {
      ...baseNetWorth,
      total_gain_loss: "-1000.00",
      total_gain_loss_pct: "-10.00",
    }
    renderCard(negative)
    expect(await screen.findByText(/You're down/)).toBeInTheDocument()
    expect(screen.getByText(/-\$1,000\.00|\$1,000\.00/)).toBeTruthy()
  })

  it("does not show XIRR or fee drag labels", async () => {
    renderCard()
    expect(screen.queryByText(/XIRR/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/fee drag/i)).not.toBeInTheDocument()
  })
})