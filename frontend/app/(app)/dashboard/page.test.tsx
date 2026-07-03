import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import DashboardPage from "./page"

const {
  mockNetWorthCard,
  mockActivityFeed,
  mockDashboardQuickTrade,
  mockSkeleton,
  mockGetNetWorth,
  mockUseHoldingsData,
} = vi.hoisted(() => ({
  mockNetWorthCard: vi.fn(),
  mockActivityFeed: vi.fn(),
  mockDashboardQuickTrade: vi.fn(),
  mockSkeleton: vi.fn(),
  mockGetNetWorth: vi.fn(),
  mockUseHoldingsData: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  )
}

describe("DashboardPage", () => {
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

  it("renders the top grid with responsive gap", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("net-worth-card")).toBeInTheDocument()
    })
    const grid = screen.getByTestId("net-worth-card").parentElement?.parentElement
    expect(grid).toHaveClass("gap-4")
    expect(grid).toHaveClass("md:gap-6")
  })

  it("renders NetWorthCard and ActivityFeed in the top grid", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("net-worth-card")).toBeInTheDocument()
    })
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument()
  })

  it("renders DashboardQuickTrade below the top grid", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-quick-trade")).toBeInTheDocument()
    })
  })

  it("renders DashboardEmptyState when there are no holdings", async () => {
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
      expect(screen.getByTestId("dashboard-empty-state")).toBeInTheDocument()
    })
  })
})
