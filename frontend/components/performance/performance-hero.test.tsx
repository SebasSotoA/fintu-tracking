import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CashFlow, NetWorthData } from "@/lib/types"
import { PerformanceHero } from "./performance-hero"

const mockGetNetWorth = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getNetWorth: (...args: unknown[]) => mockGetNetWorth(...args),
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

const depositFlow: CashFlow = {
  id: "cf-1",
  user_id: "u1",
  type: "deposit",
  amount: "10000",
  currency: "USD",
  fx_rate: null,
  usd_amount: "10000.00",
  date: "2024-01-15",
  notes: null,
  fee_type: null,
  related_trade_id: null,
  related_cash_flow_id: null,
  related_type: null,
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
}

function renderHero(
  props: {
    initialNetWorth?: NetWorthData | null
    cashFlows?: CashFlow[]
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PerformanceHero
        initialNetWorth={props.initialNetWorth ?? baseNetWorth}
        cashFlows={props.cashFlows ?? [depositFlow]}
      />
    </QueryClientProvider>,
  )
}

describe("PerformanceHero", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNetWorth.mockResolvedValue(baseNetWorth)
  })

  it("leads with net return percent, not net worth dollars", () => {
    renderHero()
    expect(screen.getByText("Net return")).toBeInTheDocument()
    expect(screen.getByText("20.00%")).toBeInTheDocument()
    expect(screen.queryByText("$12,000.00")).not.toBeInTheDocument()
  })

  it("shows gain badge with dollar and percent", () => {
    renderHero()
    const heroSection = screen.getByText("Net return").closest("section")
    expect(heroSection?.textContent).toMatch(/\$2,000\.00/)
    expect(heroSection?.textContent).toMatch(/20\.00%/)
  })

  it("shows fee drag in performance summary stat band", () => {
    renderHero()
    const summary = screen.getByLabelText("Performance summary")
    expect(within(summary).getByText("Fee drag")).toBeInTheDocument()
    expect(within(summary).getByText("1.50%")).toBeInTheDocument()
  })

  it("shows em dash for time-weighted return when XIRR is zero placeholder", () => {
    renderHero()
    const twrLabel = screen.getByText("Money-weighted return (XIRR)")
    const twrCell = twrLabel.closest("div")?.parentElement
    expect(twrCell).toBeTruthy()
    expect(within(twrCell as HTMLElement).getByText("—")).toBeInTheDocument()
  })

  it("shows three stats in performance summary without FX context", () => {
    renderHero()
    const summary = screen.getByLabelText("Performance summary")
    expect(within(summary).getByText("Money-weighted return (XIRR)")).toBeInTheDocument()
    expect(within(summary).getByText("Fee drag")).toBeInTheDocument()
    expect(within(summary).getByText("Since first deposit")).toBeInTheDocument()
    expect(within(summary).queryByText("FX context")).not.toBeInTheDocument()
  })

  it("uses net-worth query with initialData from server", () => {
    renderHero({ initialNetWorth: baseNetWorth })
    expect(screen.getByText("20.00%")).toBeInTheDocument()
    expect(mockGetNetWorth).not.toHaveBeenCalled()
  })
})
