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
  Legend: () => null,
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

  it("renders fees by type and fees by month side by side", async () => {
    mockApiGet.mockResolvedValue({
      ...feeBreakdownFixture,
      fees_by_month: { "2024-01": "40", "2024-02": "60" },
    })
    const { container } = renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Fees by type")).toBeInTheDocument()
      expect(screen.getByText("Fees by month")).toBeInTheDocument()
    })

    const chartGrid = container.querySelector(".md\\:grid-cols-2")
    expect(chartGrid).toBeTruthy()
    expect(chartGrid?.className).toContain("md:items-stretch")
    expect(container.querySelector(".h-\\[260px\\].md\\:h-\\[340px\\]")).toBeTruthy()
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(2)
  })

  it("keeps two-column layout when monthly data is empty", async () => {
    const { container } = renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Fees by type")).toBeInTheDocument()
    })

    expect(screen.getByText("Fees by month")).toBeInTheDocument()
    expect(screen.getByText("No monthly fee history yet")).toBeInTheDocument()
    expect(container.querySelector(".md\\:grid-cols-2")).toBeTruthy()
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(1)
  })

  it("does not render redundant fee summary tiles below charts", async () => {
    const { container } = renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Fee attribution")).toBeInTheDocument()
    })

    const summaryTiles = container.querySelectorAll(
      ".grid.grid-cols-2.gap-3 .rounded-lg.border",
    )
    expect(summaryTiles.length).toBe(0)
  })

  it("does not use hardcoded red hex styling", async () => {
    const { container } = renderFeeChart()
    await waitFor(() => {
      expect(screen.getByText("Fee attribution")).toBeInTheDocument()
    })
    expect(container.innerHTML).not.toContain("#ef4444")
    expect(container.innerHTML).not.toContain("bg-red-50")
  })
})
