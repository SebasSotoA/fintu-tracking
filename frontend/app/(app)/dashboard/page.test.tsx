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
  mockKpiStrip,
  mockAssetAllocation,
  mockTopHoldings,
} = vi.hoisted(() => ({
  mockNetWorthCard: vi.fn(),
  mockActivityFeed: vi.fn(),
  mockDashboardQuickTrade: vi.fn(),
  mockSkeleton: vi.fn(),
  mockGetNetWorth: vi.fn(),
  mockUseHoldingsData: vi.fn(),
  mockKpiStrip: vi.fn(),
  mockAssetAllocation: vi.fn(),
  mockTopHoldings: vi.fn(),
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

vi.mock("@/components/dashboard/kpi-strip", () => ({
  KpiStrip: (props: { initialData?: unknown }) => {
    mockKpiStrip(props)
    return <div data-testid="kpi-strip">KpiStrip</div>
  },
}))

vi.mock("@/components/dashboard/asset-allocation-card", () => ({
  AssetAllocationCard: (props: unknown) => {
    mockAssetAllocation(props)
    return <div data-testid="asset-allocation-card">AssetAllocation</div>
  },
}))

vi.mock("@/components/dashboard/top-holdings-card", () => ({
  TopHoldingsCard: (props: unknown) => {
    mockTopHoldings(props)
    return <div data-testid="top-holdings-card">TopHoldings</div>
  },
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

const mockNetWorth = {
  holdings_value: "10000.00",
  cash_balance: "2000.00",
  net_worth: "12000.00",
  total_invested: "10000.00",
  total_fees: "50.00",
  total_gain_loss: "2000.00",
  total_gain_loss_pct: "20.00",
  xirr: "0",
  breakdown: {
    by_asset_type: { etf: "6000.00", stock: "4000.00", crypto: "0.00" },
    by_ticker: {},
  },
}

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
    mockGetNetWorth.mockResolvedValue(mockNetWorth)
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

  it("renders the KPI strip at the top", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("kpi-strip")).toBeInTheDocument()
    })
  })

  it("renders the top grid with NetWorthCard and ActivityFeed", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("net-worth-card")).toBeInTheDocument()
    })
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument()
  })

  it("renders the secondary grid with AssetAllocation and TopHoldings", async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId("asset-allocation-card")).toBeInTheDocument()
    })
    expect(screen.getByTestId("top-holdings-card")).toBeInTheDocument()
  })

  it("renders DashboardQuickTrade below the cards", async () => {
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
