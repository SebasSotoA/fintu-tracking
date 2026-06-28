import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CashFlow, NetWorthData } from "@/lib/types"
import { PerformanceMetrics } from "./performance-metrics"

const mockApiGet = vi.fn()

vi.mock("@/lib/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

const netWorthWithNetInvested: NetWorthData = {
  holdings_value: "0",
  cash_balance: "394.00",
  net_worth: "394.00",
  total_invested: "394.00",
  total_fees: "6.00",
  total_gain_loss: "0.00",
  total_gain_loss_pct: "0.00",
  xirr: "0",
  breakdown: { by_asset_type: {}, by_ticker: {} },
}

const grossDepositOnly: CashFlow = {
  id: "cf-1",
  user_id: "u1",
  type: "deposit",
  amount: "400",
  currency: "USD",
  fx_rate: null,
  usd_amount: "400.00",
  broker_id: null,
  date: "2024-01-01",
  notes: null,
  fee_type: null,
  related_trade_id: null,
  related_cash_flow_id: null,
  related_type: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
}

function renderMetrics(cashFlows: CashFlow[] = [grossDepositOnly]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PerformanceMetrics trades={[]} cashFlows={cashFlows} fxRates={[]} marketPrices={[]} />
    </QueryClientProvider>,
  )
}

describe("PerformanceMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue(netWorthWithNetInvested)
  })

  it("shows total invested from net-worth API, not gross deposits", async () => {
    renderMetrics()
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/api/analytics/net-worth")
    })
    const totalInvestedCard = screen.getByText("Total Invested").closest('[data-slot="card"]')
    expect(totalInvestedCard).toBeTruthy()
    await waitFor(() => {
      expect(totalInvestedCard).toHaveTextContent("$394.00")
    })
    expect(totalInvestedCard).not.toHaveTextContent("$400.00")
  })
})
