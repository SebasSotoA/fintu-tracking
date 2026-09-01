import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { KpiStrip } from "./kpi-strip"
import type { NetWorthData } from "@/lib/types"

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const baseData: NetWorthData = {
  holdings_value: "1000",
  cash_balance: "300",
  net_worth: "1300",
  total_invested: "1000",
  total_fees: "0",
  total_gain_loss: "300",
  total_gain_loss_pct: "30",
  xirr: "0",
  breakdown: { by_asset_type: {}, by_ticker: {} },
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

describe("KpiStrip", () => {
  it("renders the three remaining KPI tile labels (no Total Portfolio, that's the Net Worth card)", () => {
    renderWithProviders(<KpiStrip initialData={baseData} />)
    expect(screen.queryByText("Total Portfolio")).not.toBeInTheDocument()
    expect(screen.getByText("Total Return")).toBeInTheDocument()
    expect(screen.getByText("Total Invested")).toBeInTheDocument()
    expect(screen.getByText("Buy Power")).toBeInTheDocument()
  })

  it("formats values as currency", () => {
    renderWithProviders(<KpiStrip initialData={baseData} />)
    expect(screen.getByText("$1,000.00")).toBeInTheDocument()
    expect(screen.getAllByText("$300.00").length).toBeGreaterThan(0)
  })

  it("renders the positive trend percentage for positive gains", () => {
    renderWithProviders(<KpiStrip initialData={baseData} />)
    expect(screen.getAllByText("+30.00%").length).toBeGreaterThan(0)
  })
})