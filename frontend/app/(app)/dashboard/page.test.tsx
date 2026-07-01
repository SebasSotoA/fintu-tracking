import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"
import { ApiError } from "@/lib/api/server-client"

const {
  mockNetWorthCard,
  mockActivityFeed,
  mockDashboardQuickTrade,
  mockSkeleton,
  mockGetNetWorth,
  mockHandleServerAuthError,
  mockFetchHoldingsData,
} = vi.hoisted(() => ({
  mockNetWorthCard: vi.fn(),
  mockActivityFeed: vi.fn(),
  mockDashboardQuickTrade: vi.fn(),
  mockSkeleton: vi.fn(),
  mockGetNetWorth: vi.fn(),
  mockHandleServerAuthError: vi.fn(),
  mockFetchHoldingsData: vi.fn(),
}))

vi.mock("@/components/dashboard/net-worth-card", () => ({
  NetWorthCard: (props: { initialData?: unknown }) => {
    mockNetWorthCard(props)
    return <div data-testid="net-worth-card">NetWorthCard</div>
  },
}))

vi.mock("@/components/dashboard/activity-feed", () => ({
  ActivityFeed: () => {
    mockActivityFeed()
    return <div data-testid="activity-feed">ActivityFeed</div>
  },
}))

vi.mock("@/components/dashboard/dashboard-quick-trade", () => ({
  DashboardQuickTrade: (props: unknown) => {
    mockDashboardQuickTrade(props)
    return <div data-testid="dashboard-quick-trade">DashboardQuickTrade</div>
  },
}))

vi.mock("@/components/dashboard/dashboard-empty-state", () => ({
  DashboardEmptyState: () => <div data-testid="dashboard-empty-state">DashboardEmptyState</div>,
}))

vi.mock("@/components/dashboard/dashboard-card-skeleton", () => ({
  ActivityFeedCardSkeleton: () => {
    mockSkeleton("ActivityFeedCardSkeleton")
    return <div data-testid="activity-feed-skeleton">ActivityFeedSkeleton</div>
  },
  HoldingsTableCardSkeleton: () => {
    mockSkeleton("HoldingsTableCardSkeleton")
    return <div data-testid="holdings-table-skeleton">HoldingsTableSkeleton</div>
  },
  NetWorthCardSkeleton: () => {
    mockSkeleton("NetWorthCardSkeleton")
    return <div data-testid="net-worth-skeleton">NetWorthSkeleton</div>
  },
}))

vi.mock("@/lib/api/server-analytics", () => ({
  getNetWorth: () => mockGetNetWorth(),
}))

vi.mock("@/lib/api/server-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/server-client")>()
  return {
    ...original,
    handleServerAuthError: (error: unknown) => mockHandleServerAuthError(error),
  }
})

vi.mock("@/components/dashboard/holdings-table-server", () => ({
  fetchHoldingsData: (...args: unknown[]) => mockFetchHoldingsData(...args),
}))

async function renderPage() {
  const { default: DashboardPage } = await import("./page")
  const ui = await DashboardPage({ searchParams: Promise.resolve({}) })
  await act(async () => {
    render(ui)
  })
}

describe("DashboardPage", () => {
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
    mockHandleServerAuthError.mockImplementation(() => {
      throw new Error("AUTH_REDIRECT")
    })
  })

  it("calls handleServerAuthError when net worth fetch returns 402", async () => {
    mockGetNetWorth.mockRejectedValue(new ApiError("Payment required", 402))

    await expect(renderPage()).rejects.toThrow("AUTH_REDIRECT")
    expect(mockHandleServerAuthError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 402 }),
    )
  })

  it("renders the top grid with responsive gap", async () => {
    await renderPage()
    const grid = screen.getByTestId("net-worth-card").parentElement?.parentElement
    expect(grid).toHaveClass("gap-4")
    expect(grid).toHaveClass("md:gap-6")
  })

  it("renders NetWorthCard and ActivityFeed in the top grid", async () => {
    await renderPage()
    expect(screen.getByTestId("net-worth-card")).toBeInTheDocument()
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument()
  })

  it("renders DashboardQuickTrade below the top grid", async () => {
    await renderPage()
    expect(screen.getByTestId("dashboard-quick-trade")).toBeInTheDocument()
  })

  it("renders DashboardEmptyState when there are no holdings", async () => {
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
    expect(screen.getByTestId("dashboard-empty-state")).toBeInTheDocument()
  })
})
