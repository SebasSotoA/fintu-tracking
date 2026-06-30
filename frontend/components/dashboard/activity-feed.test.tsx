import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ActivityFeed } from "./activity-feed"
import type { ActivityItem } from "@/lib/api/activity"

const mockGetActivityFeed = vi.fn()

vi.mock("@/lib/api/activity", () => ({
  getActivityFeed: (limit: number) => mockGetActivityFeed(limit),
}))

vi.mock("@/components/trades/add-trade-dialog", () => ({
  AddTradeDialog: ({ children }: { children?: React.ReactNode }) => (
    <button type="button" data-testid="add-trade-dialog-trigger">
      {children ?? "Add Trade"}
    </button>
  ),
}))

vi.mock("@/components/cash-flows/add-cash-flow-dialog", () => ({
  AddCashFlowDialog: ({ children }: { children?: React.ReactNode }) => (
    <button type="button" data-testid="add-cash-flow-dialog-trigger">
      {children ?? "Add Cash Flow"}
    </button>
  ),
}))

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("ActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders empty state with CTAs when there is no activity", async () => {
    mockGetActivityFeed.mockResolvedValue([])
    renderWithProviders(<ActivityFeed />)
    await waitFor(() => {
      expect(screen.getByText("No activity yet")).toBeInTheDocument()
    })
    expect(screen.getByTestId("add-trade-dialog-trigger")).toBeInTheDocument()
    expect(screen.getByTestId("add-cash-flow-dialog-trigger")).toBeInTheDocument()
  })

  it("renders activity items when data exists", async () => {
    const items: ActivityItem[] = [
      {
        id: "1",
        date: "2026-01-01",
        kind: "trade",
        sub_kind: "buy",
        ticker: "AAPL",
        direction: "out",
        amount_usd: "1500.00",
        details: "Bought AAPL",
      },
    ]
    mockGetActivityFeed.mockResolvedValue(items)
    renderWithProviders(<ActivityFeed />)
    await waitFor(() => {
      expect(screen.getByText(/Bought AAPL/i)).toBeInTheDocument()
    })
  })
})
