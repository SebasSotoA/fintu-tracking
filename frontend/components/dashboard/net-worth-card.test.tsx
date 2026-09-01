import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
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
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>
        <NetWorthCard initialData={props.initialData ?? baseNetWorth} />
      </QueryClientProvider>
    </EnglishLocaleWrapper>,
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

  it("does not render the buy power section (it lives in the KPI strip)", () => {
    renderCard()
    expect(screen.queryByText("Buy power")).not.toBeInTheDocument()
  })

  it("shows loading skeleton layout while fetching", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { container } = render(
      <EnglishLocaleWrapper>
        <QueryClientProvider client={queryClient}>
          <NetWorthCard />
        </QueryClientProvider>
      </EnglishLocaleWrapper>,
    )
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(2)
  })

  it("exposes the gain/loss value for KPI consumers via a hidden marker", () => {
    renderCard()
    const marker = screen.getByTestId("net-worth-gain-loss")
    expect(marker).toHaveTextContent("$2,000.00")
  })

  it("keeps buy power tooltip copy aligned with hapi meaning", () => {
    expect(METRIC_TOOLTIPS.cash).toContain("poder de compra")
  })
})
