import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PortfolioPerformanceChart } from "./portfolio-performance-chart"
import type { PerformancePoint } from "@/lib/api/analytics"

const mockGetPerformanceTimeSeries = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getPerformanceTimeSeries: (...args: unknown[]) => mockGetPerformanceTimeSeries(...args),
}))

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

const timeSeriesFixture: PerformancePoint[] = [
  {
    date: "2025-01-01",
    portfolio_value: "10000",
    invested_capital: "9500",
    cumulative_fees: "50",
    cumulative_fx_impact: "0",
    net_return: "500",
    net_return_pct: "5",
  },
  {
    date: "2025-02-01",
    portfolio_value: "10500",
    invested_capital: "9500",
    cumulative_fees: "50",
    cumulative_fx_impact: "0",
    net_return: "1000",
    net_return_pct: "10",
  },
]

function renderChart() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PortfolioPerformanceChart />
    </QueryClientProvider>,
  )
}

describe("PortfolioPerformanceChart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPerformanceTimeSeries.mockResolvedValue(timeSeriesFixture)
  })

  it("fetches performance time series with month interval by default", async () => {
    renderChart()
    await waitFor(() => {
      expect(mockGetPerformanceTimeSeries).toHaveBeenCalledWith("month")
    })
  })

  it("renders chart when points exist", async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByText("Portfolio vs invested")).toBeInTheDocument()
    })
    expect(screen.queryByText(/historical path of holdings/i)).toBeNull()
    expect(screen.getByTestId("line-chart")).toBeInTheDocument()
    expect(screen.getByText("Portfolio value")).toBeInTheDocument()
    expect(screen.getByText("Invested capital")).toBeInTheDocument()
  })

  it("shows empty state when API returns no points", async () => {
    mockGetPerformanceTimeSeries.mockResolvedValue([])
    renderChart()
    await waitFor(() => {
      expect(screen.getByText(/no performance history yet/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId("line-chart")).toBeNull()
  })

  it("refetches when interval changes to quarter", async () => {
    const user = userEvent.setup()
    renderChart()
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /quarter/i })).toBeInTheDocument()
    })
    expect(mockGetPerformanceTimeSeries).toHaveBeenCalledWith("month")
    await user.click(screen.getByRole("radio", { name: /quarter/i }))
    await waitFor(() => {
      expect(mockGetPerformanceTimeSeries).toHaveBeenCalledWith("quarter")
    })
  })
})
