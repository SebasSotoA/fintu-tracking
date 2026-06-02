import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReturnAttribution } from "./return-attribution"

const mockApiGet = vi.fn()

vi.mock("@/lib/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

vi.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  Line: () => null,
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

const attributionFixture = {
  starting_capital: "10000",
  market_gains: "500",
  market_gains_pct: "5",
  deposit_fees_impact: "50",
  trading_fees_impact: "30",
  closing_fees_impact: "20",
  total_fees_impact: "100",
  total_fees_impact_pct: "1",
  fx_impact: "0",
  fx_impact_pct: "0",
  net_position: "10400",
  net_return_pct: "4",
}

function renderAttribution() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReturnAttribution />
    </QueryClientProvider>,
  )
}

describe("ReturnAttribution", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue(attributionFixture)
  })

  it("uses MetricLabel in summary via StatCell and semantic gain/loss colors", async () => {
    const { container } = renderAttribution()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /about starting capital/i })).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /about market gains/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about total fees/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about net worth/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /about net position/i })).toBeNull()

    expect(container.querySelector(".text-green-600")).toBeNull()
    expect(container.querySelector(".text-red-600")).toBeNull()
    expect(container.querySelector(".bg-red-50")).toBeNull()

    const marketGainsValue = screen.getByText(/\+\$500\.00/).closest("p")
    expect(marketGainsValue).toHaveClass("text-primary")

    const totalFeesValue = screen.getByText(/-\$100\.00/).closest("p")
    expect(totalFeesValue).toHaveClass("text-destructive")
  })

  it("shows net worth summary matching API net_position", async () => {
    renderAttribution()
    await waitFor(() => {
      expect(screen.getByText(/\$10,400\.00/)).toBeInTheDocument()
    })
    expect(screen.getByText("Net worth")).toBeInTheDocument()
    expect(screen.queryByText("Net Position")).toBeNull()
  })

  it("omits FX from waterfall when fx_impact is below threshold", async () => {
    renderAttribution()
    await waitFor(() => {
      expect(screen.getByTestId("composed-chart")).toBeInTheDocument()
    })
    expect(screen.queryByText(/fx impact/i)).toBeNull()
  })

  it("renders title icon with muted foreground", async () => {
    const { container } = renderAttribution()
    await waitFor(() => {
      expect(screen.getByText("Return Attribution Analysis")).toBeInTheDocument()
    })
    const titleIcon = container.querySelector("svg.lucide-trending-up, svg.lucide-trending-down")
    expect(titleIcon).toHaveClass("text-muted-foreground")
  })
})
