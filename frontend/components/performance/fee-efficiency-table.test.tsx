import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FeeEfficiencyTable } from "./fee-efficiency-table"
import type { FeeEfficiencyData } from "@/lib/api/analytics"

const mockGetFeeEfficiency = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getFeeEfficiency: () => mockGetFeeEfficiency(),
}))

const feeEfficiencyFixture: FeeEfficiencyData = {
  by_ticker: [
    {
      ticker: "AAPL",
      trade_count: "2",
      total_fees: "5.00",
      total_value: "1000.00",
      avg_fee_pct: "0.5",
    },
    {
      ticker: "VOO",
      trade_count: "1",
      total_fees: "10.00",
      total_value: "500.00",
      avg_fee_pct: "2.0",
    },
  ],
}

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FeeEfficiencyTable />
    </QueryClientProvider>,
  )
}

describe("FeeEfficiencyTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFeeEfficiency.mockResolvedValue(feeEfficiencyFixture)
  })

  it("renders nothing when API returns empty by_ticker", async () => {
    mockGetFeeEfficiency.mockResolvedValue({ by_ticker: [] })
    const { container } = renderTable()
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
    expect(screen.queryByText("Fee efficiency by ticker")).not.toBeInTheDocument()
  })

  it("renders sortable table sorted by avg fee pct descending by default", async () => {
    renderTable()
    await waitFor(() => {
      expect(screen.getByText("Fee efficiency by ticker")).toBeInTheDocument()
    })
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("VOO")
    expect(rows[2]).toHaveTextContent("AAPL")
  })

  it("toggles sort when clicking avg fee column header", async () => {
    const user = userEvent.setup()
    renderTable()
    await waitFor(() => {
      expect(screen.getByText("VOO")).toBeInTheDocument()
    })
    const avgFeeHeader = screen.getByRole("button", { name: /avg fee/i })
    await user.click(avgFeeHeader)
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("AAPL")
    expect(avgFeeHeader).toHaveAttribute("aria-sort", "ascending")
  })
})
