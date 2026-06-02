import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FeeAttributionChart } from "./fee-attribution-chart"

const mockApiGet = vi.fn()

vi.mock("@/lib/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => null,
}))

const feeBreakdownFixture = {
  deposit_fees: "50",
  trading_fees: "30",
  closing_fees: "20",
  maintenance_fees: "0",
  other_fees: "0",
  total_fees: "100",
  fees_by_month: {} as Record<string, string>,
}

function renderFeeChart() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FeeAttributionChart />
    </QueryClientProvider>,
  )
}

describe("FeeAttributionChart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue(feeBreakdownFixture)
  })

  it("shows monthly fees section when fees_by_month has entries", async () => {
    mockApiGet.mockResolvedValue({
      ...feeBreakdownFixture,
      fees_by_month: { "2024-01": "40", "2024-02": "60" },
    })
    renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Fees by month")).toBeInTheDocument()
    })
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(2)
  })

  it("hides monthly fees section when fees_by_month is empty", async () => {
    renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Fee attribution")).toBeInTheDocument()
    })
    expect(screen.queryByText("Fees by month")).not.toBeInTheDocument()
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(1)
  })

  it("does not use hardcoded red hex styling on fee type tiles", async () => {
    const { container } = renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Deposit Fees")).toBeInTheDocument()
    })
    expect(container.innerHTML).not.toContain("#ef4444")
    expect(container.innerHTML).not.toContain("bg-red-50")
  })
})
