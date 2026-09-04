import { describe, expect, it, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import PerformancePage from "./page"

const { mockPerformanceContent, mockPerformanceEmptyState, mockGetNetWorth, mockUseHoldingsData } =
  vi.hoisted(() => ({
    mockPerformanceContent: vi.fn(),
    mockPerformanceEmptyState: vi.fn(),
    mockGetNetWorth: vi.fn(),
    mockUseHoldingsData: vi.fn(),
  }))

vi.mock("@/components/performance/performance-content", () => ({
  PerformanceContent: (props: unknown) => {
    mockPerformanceContent(props)
    return <div data-testid="performance-content">PerformanceContent</div>
  },
}))

vi.mock("@/components/performance/performance-empty-state", () => ({
  PerformanceEmptyState: () => {
    mockPerformanceEmptyState()
    return <div data-testid="performance-empty-state">PerformanceEmptyState</div>
  },
}))

vi.mock("@/lib/api/analytics", () => ({
  getNetWorth: () => mockGetNetWorth(),
}))

vi.mock("@/hooks/use-holdings-data", () => ({
  useHoldingsData: (...args: unknown[]) => mockUseHoldingsData(...args),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <PerformancePage />
    </QueryClientProvider>,
  )
}

describe("PerformancePage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetNetWorth.mockResolvedValue({})
    mockUseHoldingsData.mockReturnValue({
      isLoading: false,
      data: {
        holdings: [{ ticker: "AAPL" }],
        total: 1,
        page: 1,
        pageSize: 10,
        priceUpdatedAtByTicker: {},
        lastPriceRefreshAt: null,
      },
    })
  })

  it("shows PerformancePageSkeleton while holdings load, not a Spinner", () => {
    mockUseHoldingsData.mockReturnValue({
      isLoading: true,
      data: undefined,
    })

    const { container } = renderPage()

    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument()
    expect(screen.getByTestId("chart-panel-skeleton-plot")).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    expect(container.querySelector("svg.animate-spin")).toBeNull()
    expect(screen.queryByTestId("performance-content")).not.toBeInTheDocument()
    expect(mockPerformanceContent).not.toHaveBeenCalled()
  })

  it("renders PerformanceContent when holdings exist", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("performance-content")).toBeInTheDocument()
    })
    expect(mockPerformanceContent).toHaveBeenCalled()
  })

  it("renders PerformanceEmptyState when there are no holdings", async () => {
    mockUseHoldingsData.mockReturnValue({
      isLoading: false,
      data: {
        holdings: [],
        total: 0,
        page: 1,
        pageSize: 10,
        priceUpdatedAtByTicker: {},
        lastPriceRefreshAt: null,
      },
    })

    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("performance-empty-state")).toBeInTheDocument()
    })
    expect(mockPerformanceEmptyState).toHaveBeenCalled()
  })
})
