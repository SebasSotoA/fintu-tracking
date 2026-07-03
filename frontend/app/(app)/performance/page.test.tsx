import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"

const { mockPerformanceContent, mockPerformanceEmptyState, mockGetNetWorth, mockFetchHoldingsData } =
  vi.hoisted(() => ({
    mockPerformanceContent: vi.fn(),
    mockPerformanceEmptyState: vi.fn(),
    mockGetNetWorth: vi.fn(),
    mockFetchHoldingsData: vi.fn(),
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

vi.mock("@/lib/api/server-analytics", () => ({
  getNetWorth: () => mockGetNetWorth(),
}))

vi.mock("@/components/dashboard/holdings-table-server", () => ({
  fetchHoldingsData: (...args: unknown[]) => mockFetchHoldingsData(...args),
}))

vi.mock("./loading", () => ({
  default: () => <div data-testid="performance-loading">PerformanceLoading</div>,
}))

async function renderPage() {
  const { default: PerformancePage } = await import("./page")
  const ui = PerformancePage()
  await act(async () => {
    render(ui)
  })
}

describe("PerformancePage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetNetWorth.mockResolvedValue({})
    mockFetchHoldingsData.mockResolvedValue({
      holdings: [{ ticker: "AAPL" }],
      total: 1,
      page: 1,
      pageSize: 10,
      priceUpdatedAtByTicker: {},
      lastPriceRefreshAt: null,
    })
  })

  it("renders PerformanceContent when holdings exist", async () => {
    await renderPage()
    expect(screen.getByTestId("performance-content")).toBeInTheDocument()
    expect(mockPerformanceContent).toHaveBeenCalled()
  })

  it("renders PerformanceEmptyState when there are no holdings", async () => {
    mockFetchHoldingsData.mockResolvedValue({
      holdings: [],
      total: 0,
      page: 1,
      pageSize: 10,
      priceUpdatedAtByTicker: {},
      lastPriceRefreshAt: null,
    })

    vi.resetModules()
    await renderPage()
    expect(screen.getByTestId("performance-empty-state")).toBeInTheDocument()
    expect(mockPerformanceEmptyState).toHaveBeenCalled()
  })
})
