import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
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

const negativeNetWorth: NetWorthData = {
  holdings_value: "8000.00",
  cash_balance: "1000.00",
  net_worth: "9000.00",
  total_invested: "10000.00",
  total_fees: "150.00",
  total_gain_loss: "-1000.00",
  total_gain_loss_pct: "-10.00",
  xirr: "0",
  breakdown: { by_asset_type: {}, by_ticker: {} },
}

function renderHero(netWorth: NetWorthData = baseNetWorth) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PerformanceHero initialNetWorth={netWorth} />
    </QueryClientProvider>,
  )
}

describe("PerformanceHero", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNetWorth.mockResolvedValue(baseNetWorth)
  })

  it("shows 'You're up' headline with dollar and percent for positive gains", () => {
    renderHero()
    expect(screen.getByText(/You're up/)).toBeInTheDocument()
    expect(screen.getByText(/\$2,000\.00/)).toBeInTheDocument()
    expect(screen.getByText(/20\.00%/)).toBeInTheDocument()
  })

  it("shows 'You're down' headline for negative gains", () => {
    renderHero(negativeNetWorth)
    expect(screen.getByText(/You're down/)).toBeInTheDocument()
    expect(screen.getByText(/\$1,000\.00/)).toBeInTheDocument()
    expect(screen.getByText(/-10\.00%/)).toBeInTheDocument()
  })

  it("shows invested amount in subtitle", () => {
    renderHero()
    expect(screen.getByText(/based on \$10,000\.00 invested/)).toBeInTheDocument()
  })

  it("does not show XIRR or fee drag labels", () => {
    renderHero()
    expect(screen.queryByText(/XIRR/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/fee drag/i)).not.toBeInTheDocument()
  })

  it("uses net-worth query with initialData from server", () => {
    renderHero(baseNetWorth)
    expect(screen.getByText(/You're up/)).toBeInTheDocument()
    expect(mockGetNetWorth).not.toHaveBeenCalled()
  })
})