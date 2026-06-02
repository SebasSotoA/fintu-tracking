import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FxImpactCard } from "./fx-impact-card"
import type { FxImpactReport, FxRateChartPoint } from "@/lib/api/analytics"

const mockGetFxImpact = vi.fn()
const mockGetFxRateChart = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getFxImpact: () => mockGetFxImpact(),
  getFxRateChart: () => mockGetFxRateChart(),
}))

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sparkline">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

const zeroImpactFixture: FxImpactReport = {
  avg_investment_rate: "4100.00",
  current_rate: "4200.00",
  rate_change_pct: "2.44",
  fx_impact_usd: "0",
  fx_impact_pct: "0",
  impact_by_period: {},
}

const rateChartFixture: FxRateChartPoint[] = [
  { date: "2025-01-01", rate: "4000" },
  { date: "2025-02-01", rate: "4200" },
]

function renderFxCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FxImpactCard />
    </QueryClientProvider>,
  )
}

describe("FxImpactCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFxImpact.mockResolvedValue(zeroImpactFixture)
    mockGetFxRateChart.mockResolvedValue(rateChartFixture)
  })

  it("uses honest FX rate context title, not FX gain", async () => {
    renderFxCard()
    await waitFor(() => {
      expect(screen.getByText("FX rate context")).toBeInTheDocument()
    })
    expect(screen.queryByText(/fx gain/i)).toBeNull()
  })

  it("shows rate comparison when fx_impact_usd is zero", async () => {
    renderFxCard()
    await waitFor(() => {
      expect(screen.getByText(/avg deposit rate vs current/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/\+\$.*fx impact/i)).toBeNull()
  })

  it("includes approximate impact disclaimer", async () => {
    renderFxCard()
    await waitFor(() => {
      expect(
        screen.getByText(/dollar impact may show as zero while rates are informational/i),
      ).toBeInTheDocument()
    })
  })

  it("renders sparkline when rate chart has points", async () => {
    renderFxCard()
    await waitFor(() => {
      expect(screen.getByTestId("sparkline")).toBeInTheDocument()
    })
  })
})
