import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReconciliationDashboard } from "./reconciliation-dashboard"

const mockApiGet = vi.fn()

vi.mock("@/lib/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

const reconciledReport = {
  is_reconciled: true,
  total_trade_fees: "100",
  total_cash_flow_fees: "100",
  difference: "0",
  missing_links: [],
  orphaned_cash_flows: [],
  unlinked_cash_flows: [],
  discrepancies: [],
}

const unreconciledReport = {
  is_reconciled: false,
  total_trade_fees: "100",
  total_cash_flow_fees: "90",
  difference: "10",
  missing_links: ["trade-abc"],
  orphaned_cash_flows: [],
  unlinked_cash_flows: [],
  discrepancies: [],
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReconciliationDashboard />
    </QueryClientProvider>,
  )
}

describe("ReconciliationDashboard", () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it("renders nothing when data is fully reconciled", async () => {
    mockApiGet.mockResolvedValue(reconciledReport)

    const { container } = renderDashboard()

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/api/analytics/cash-reconciliation")
    })

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText("Data Health & Reconciliation")).not.toBeInTheDocument()
  })

  it("shows warning UI when reconciliation fails", async () => {
    mockApiGet.mockResolvedValue(unreconciledReport)

    renderDashboard()

    expect(await screen.findByText("Data Health & Reconciliation")).toBeInTheDocument()
    expect(screen.getByText("1 Issue Found")).toBeInTheDocument()
    expect(screen.getByText("Missing Cash Flow Links")).toBeInTheDocument()
  })
})
