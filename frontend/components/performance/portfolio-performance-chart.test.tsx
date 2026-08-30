import type { ReactNode } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PortfolioPerformanceChart } from "./portfolio-performance-chart"
import type { PerformancePoint } from "@/lib/api/analytics"
import type { TradeDateRange } from "@/lib/trades/trade-filters"

const mockGetPerformanceTimeSeries = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getPerformanceTimeSeries: (...args: unknown[]) => mockGetPerformanceTimeSeries(...args),
}))

let lastDateRangePickerProps: {
  ariaLabel: string
  label: string
  hideLabel?: boolean
  value: TradeDateRange
  onChange: (next: TradeDateRange) => void
  formatLabel: (range: TradeDateRange) => string
  popoverAlign?: "start" | "center" | "end"
} | null = null

vi.mock("@/components/filters/date-range-picker", () => ({
  DateRangePicker: (props: {
    ariaLabel: string
    label: string
    hideLabel?: boolean
    value: TradeDateRange
    onChange: (next: TradeDateRange) => void
    formatLabel: (range: TradeDateRange) => string
    popoverAlign?: "start" | "center" | "end"
  }) => {
    lastDateRangePickerProps = props
    const { ariaLabel, label, hideLabel, value, onChange, formatLabel } = props
    return (
      <div>
        {!hideLabel && <span>{label}</span>}
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={() => onChange({ from: "2025-01-15", to: "2025-02-01" })}
        >
          {formatLabel(value)}
        </button>
      </div>
    )
  },
}))

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
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
    lastDateRangePickerProps = null
    mockGetPerformanceTimeSeries.mockResolvedValue(timeSeriesFixture)
  })

  it("fetches performance time series with year interval for all time", async () => {
    renderChart()
    await waitFor(() => {
      expect(mockGetPerformanceTimeSeries).toHaveBeenCalledWith("year")
    })
    expect(mockGetPerformanceTimeSeries).not.toHaveBeenCalledWith("quarter")
  })

  it("renders chart when points exist", async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByText("Your money over time")).toBeInTheDocument()
    })
    expect(screen.getByTestId("area-chart")).toBeInTheDocument()
  })

  it("shows empty state when API returns no points", async () => {
    mockGetPerformanceTimeSeries.mockResolvedValue([])
    renderChart()
    await waitFor(() => {
      expect(screen.getByText(/no performance data yet/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId("area-chart")).toBeNull()
  })

  it("shows error state when fetch fails", async () => {
    mockGetPerformanceTimeSeries.mockRejectedValue(new Error("Network error"))
    renderChart()
    await waitFor(() => {
      expect(screen.getByText(/unable to load performance history/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId("area-chart")).toBeNull()
  })

  it("has an All time button and calendar trigger, with no visible Date range label", async () => {
    renderChart()
    const allTime = await screen.findByRole("button", { name: "All time" })
    expect(allTime).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /filter.*date range/i })).toBeInTheDocument()
    expect(screen.queryByText("Date range")).not.toBeInTheDocument()
    expect(screen.queryByRole("radio", { name: /month/i })).toBeNull()
    expect(screen.queryByRole("radio", { name: /quarter/i })).toBeNull()
    expect(screen.queryByRole("radio", { name: /year/i })).toBeNull()
    expect(screen.queryByText("Month")).toBeNull()
    expect(screen.queryByText("Quarter")).toBeNull()
    expect(screen.queryByText("Year")).toBeNull()
  })

  it("passes popoverAlign end so the calendar lines up with the right-side trigger", async () => {
    renderChart()
    await waitFor(() => {
      expect(lastDateRangePickerProps).not.toBeNull()
    })
    expect(lastDateRangePickerProps?.popoverAlign).toBe("end")
  })

  it("client-filters points by selected range and derives day interval", async () => {
    const user = userEvent.setup()
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId("area-chart")).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: /filter.*date range/i }))
    await waitFor(() => {
      expect(mockGetPerformanceTimeSeries).toHaveBeenCalledWith("day")
    })
    expect(mockGetPerformanceTimeSeries).not.toHaveBeenCalledWith("quarter")
    await waitFor(() => {
      expect(screen.queryByTestId("area-chart")).toBeNull()
      expect(screen.getByText(/no performance data yet/i)).toBeInTheDocument()
    })
    const allTime = screen.getByRole("button", { name: "All time" })
    expect(allTime).toHaveAttribute("aria-pressed", "false")
  })
})
