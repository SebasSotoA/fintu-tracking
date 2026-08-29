import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { PerformanceInsightStrip } from "./performance-insight-strip"

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
  total_gain_loss_pct: "20.00",
  xirr: "12.40",
  total_deposited_cop: "48000000",
  breakdown: { by_asset_type: {}, by_ticker: {} },
}

const baseAttribution = {
  starting_capital: "9876.54",
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

function renderStrip(netWorth: NetWorthData | null = baseNetWorth) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PerformanceInsightStrip initialNetWorth={netWorth} />
    </QueryClientProvider>,
  )
}

function tileByLabel(label: string): HTMLElement {
  const heading = screen.getByText(label)
  const tile = heading.closest("[data-slot='card']")
  if (!tile) throw new Error(`No card found for label ${label}`)
  return tile as HTMLElement
}

describe("PerformanceInsightStrip", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNetWorth.mockResolvedValue(baseNetWorth)
    mockGetReturnAttribution.mockResolvedValue(baseAttribution)
    mockGetFxImpact.mockResolvedValue(baseFxImpact)
  })

  it("renders four labels COP DEPOSITED / ARRIVED AT BROKER / FX IMPACT / FEES PAID", async () => {
    renderStrip()
    expect(await screen.findByText("COP DEPOSITED")).toBeInTheDocument()
    expect(screen.getByText("ARRIVED AT BROKER")).toBeInTheDocument()
    expect(screen.getByText("FX IMPACT")).toBeInTheDocument()
    expect(screen.getByText("FEES PAID")).toBeInTheDocument()
    expect(screen.queryByText("DEPOSITED")).not.toBeInTheDocument()
  })

  it("formats COP deposited with a COP prefix, not a dollar sign", async () => {
    renderStrip()
    await screen.findByText("COP DEPOSITED")
    const tile = tileByLabel("COP DEPOSITED")
    expect(within(tile).getByText("COP 48.000.000")).toBeInTheDocument()
    expect(within(tile).queryByText(/\$/)).not.toBeInTheDocument()
    expect(within(tile).getByText("Total sent to broker")).toBeInTheDocument()
  })

  it("does not render You're up copy", async () => {
    renderStrip()
    await screen.findByText("COP DEPOSITED")
    expect(screen.queryByText(/you're up/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/you're down/i)).not.toBeInTheDocument()
  })

  it("renders FX value without success or destructive colour classes", async () => {
    renderStrip()
    await screen.findByText("FX IMPACT")
    const fxTile = tileByLabel("FX IMPACT")
    const value = within(fxTile).getByText("−$12.40")
    expect(value).toHaveClass("text-foreground")
    expect(value).not.toHaveClass("text-success")
    expect(value).not.toHaveClass("text-destructive")
    expect(fxTile.querySelector(".text-success")).toBeNull()
    expect(fxTile.querySelector(".text-destructive")).toBeNull()
  })
})
