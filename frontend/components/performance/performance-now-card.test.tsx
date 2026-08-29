import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { PerformanceNowCard } from "./performance-now-card"

const mockGetNetWorth = vi.fn()
const mockGetReturnAttribution = vi.fn()
const mockGetFxImpact = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getNetWorth: (...args: unknown[]) => mockGetNetWorth(...args),
  getReturnAttribution: (...args: unknown[]) => mockGetReturnAttribution(...args),
  getFxImpact: (...args: unknown[]) => mockGetFxImpact(...args),
}))

const baseNetWorth: NetWorthData = {
  holdings_value: "10000.00",
  cash_balance: "2000.00",
  net_worth: "12000.00",
  total_invested: "10000.00",
  total_fees: "150.00",
  total_gain_loss: "2000.00",
  total_gain_loss_pct: "99.99",
  xirr: "12.40",
  total_deposited_cop: "48000000",
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

const baseFxImpact = {
  avg_investment_rate: "4000",
  current_rate: "4100",
  rate_change_pct: "2.50",
  fx_impact_usd: "-12.40",
  fx_impact_pct: "-0.12",
  impact_by_period: {},
}

function renderCard(netWorth: NetWorthData | null = baseNetWorth) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PerformanceNowCard initialNetWorth={netWorth} />
    </QueryClientProvider>,
  )
}

describe("PerformanceNowCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNetWorth.mockResolvedValue(baseNetWorth)
    mockGetReturnAttribution.mockResolvedValue(baseAttribution)
    mockGetFxImpact.mockResolvedValue(baseFxImpact)
  })

  it("renders Net worth and gain percent on money invested", async () => {
    renderCard()
    expect(await screen.findByText("Net worth")).toBeInTheDocument()
    expect(screen.getByText("$12,000.00")).toBeInTheDocument()
    expect(screen.getByText(/\+\$2,000\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\(\+20\.00% on money invested\)/)).toBeInTheDocument()
  })

  it("renders signed gain and percent on two separate lines", async () => {
    renderCard()
    const gain = await screen.findByText(/\+\$2,000\.00/)
    const pct = screen.getByText(/\(\+20\.00% on money invested\)/)
    expect(gain.closest("p")).not.toBe(pct.closest("p"))
    expect(gain).toHaveClass("font-semibold")
    expect(pct).toHaveClass("text-sm", "text-muted-foreground")
    expect(gain.closest(".gap-3")).toBeTruthy()
  })

  it("formats COP rows with COP prefix and shows current FX rate, not a conversion of deposits", async () => {
    renderCard()
    await screen.findByText("COP deposited")
    expect(screen.getByText("COP 48.000.000")).toBeInTheDocument()
    expect(screen.getByText("Recorded pesos, not a conversion")).toBeInTheDocument()
    expect(screen.getByText("COP 49.200.000")).toBeInTheDocument()
    expect(screen.getByText(/at 4,100\.00 COP\/USD/)).toBeInTheDocument()
    expect(screen.queryByText(/\$ 48/)).not.toBeInTheDocument()
  })

  it("does not label gain as vs previous period or You're up", async () => {
    renderCard()
    await screen.findByText("Net worth")
    expect(screen.queryByText(/vs previous period/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/you're up/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/you're down/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/99\.99/)).not.toBeInTheDocument()
  })

  it("omits XIRR when missing", async () => {
    mockGetNetWorth.mockResolvedValue({ ...baseNetWorth, xirr: "0" })
    renderCard({ ...baseNetWorth, xirr: "0" })
    await screen.findByText("Net worth")
    expect(screen.queryByText("XIRR")).not.toBeInTheDocument()
  })

  it("omits COP bridge when there is no COP deposit or FX rate", async () => {
    mockGetNetWorth.mockResolvedValue({ ...baseNetWorth, total_deposited_cop: undefined })
    mockGetFxImpact.mockResolvedValue({ ...baseFxImpact, current_rate: "0" })
    renderCard({ ...baseNetWorth, total_deposited_cop: undefined })
    await screen.findByText("Net worth")
    expect(screen.queryByText("COP deposited")).not.toBeInTheDocument()
    expect(screen.queryByText("Worth in COP today")).not.toBeInTheDocument()
  })
})
