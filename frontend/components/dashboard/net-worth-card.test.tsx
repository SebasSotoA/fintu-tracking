import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { METRIC_TOOLTIPS, NetWorthCard } from "./net-worth-card"

const mockApiGet = vi.fn()

vi.mock("@/lib/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

vi.mock("@/hooks/use-portfolio-health", () => ({
  usePortfolioHealth: () => ({ alerts: [], dismiss: vi.fn() }),
}))

const baseNetWorth: NetWorthData = {
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

function renderCard(props: { initialData?: NetWorthData | null } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NetWorthCard initialData={props.initialData ?? baseNetWorth} />
    </QueryClientProvider>,
  )
}

describe("NetWorthCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue(baseNetWorth)
  })

  it("shows portfolio total hero label", () => {
    renderCard()
    expect(screen.getByText("Portfolio total")).toBeInTheDocument()
  })

  it("shows buy power section and hides legacy metric rows", () => {
    renderCard()
    expect(screen.getByText("Buy power")).toBeInTheDocument()
    expect(screen.queryByText("Portfolio value")).not.toBeInTheDocument()
    expect(screen.queryByText("Total invested")).not.toBeInTheDocument()
    expect(screen.queryByText("Money-weighted return (XIRR)")).not.toBeInTheDocument()
  })

  it("shows loading skeleton layout while fetching", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NetWorthCard />
      </QueryClientProvider>,
    )
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(2)
  })

  it("renders unrealized proxy badge when gain/loss is non-zero", () => {
    const { container } = renderCard()
    const badge = container.querySelector(".max-w-full.truncate")
    expect(badge).toBeInTheDocument()
    expect(screen.getByText(/Unrealized P\/L proxy/i)).toBeInTheDocument()
  })

  it("keeps buy power tooltip copy aligned with hapi meaning", () => {
    expect(METRIC_TOOLTIPS.cash).toContain("poder de compra")
  })

  it("renders the merged Notifications section", () => {
    renderCard()
    expect(screen.getByText("Notifications")).toBeInTheDocument()
    expect(screen.getByText("No notifications")).toBeInTheDocument()
  })
})
