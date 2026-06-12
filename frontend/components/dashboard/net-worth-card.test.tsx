import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { METRIC_TOOLTIPS, NetWorthCard } from "./net-worth-card"

const mockApiGet = vi.fn()

vi.mock("@/lib/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
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

  it("does not show redundant portfolio net worth card header", () => {
    renderCard()
    expect(screen.queryByText("Portfolio Net Worth")).not.toBeInTheDocument()
    expect(screen.queryByText(/single source of truth/i)).not.toBeInTheDocument()
    expect(screen.getByText("Net worth")).toBeInTheDocument()
  })

  it("renders asset allocation labels in uppercase", () => {
    renderCard()
    expect(screen.getByText("ETF")).toBeInTheDocument()
    expect(screen.getByText("STOCK")).toBeInTheDocument()
    expect(screen.getByText("CRYPTO")).toBeInTheDocument()
    expect(screen.queryByText("etf")).not.toBeInTheDocument()
  })

  it("shows em dash for time-weighted return when XIRR is zero placeholder", () => {
    renderCard()
    const twrLabel = screen.getByText("Money-weighted return (XIRR)")
    const twrCell = twrLabel.closest("div")?.parentElement
    expect(twrCell).toBeTruthy()
    expect(within(twrCell as HTMLElement).getByText("—")).toBeInTheDocument()
    expect(within(twrCell as HTMLElement).queryByText("0.00%")).not.toBeInTheDocument()
  })

  it("renders secondary stats row from net-worth API fields", () => {
    renderCard()
    expect(screen.getByText("Portfolio value")).toBeInTheDocument()
    expect(screen.getByText("Total invested")).toBeInTheDocument()
    expect(screen.getByText("Total gain/loss")).toBeInTheDocument()
    expect(screen.getByText("Total fees")).toBeInTheDocument()
    const portfolioSummary = screen.getByLabelText("Portfolio summary")
    expect(portfolioSummary).toHaveTextContent("$10,000.00")
    expect(portfolioSummary).toHaveTextContent("$2,000.00")
    expect(portfolioSummary).toHaveTextContent("$50.00")
    expect(portfolioSummary).toHaveTextContent("20.00%")
  })

  it("does not show COP conversion line", () => {
    renderCard()
    expect(screen.queryByText(/COP\/USD/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$[\d,]+ COP/i)).not.toBeInTheDocument()
  })

  it("exposes tooltip triggers for key metrics", () => {
    renderCard()
    expect(screen.getByRole("button", { name: /about net worth/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about total gain\/loss/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about portfolio value/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about money-weighted return \(xirr\)/i })).toBeInTheDocument()
  })

  it("documents total invested as net capital after linked transfer fees", () => {
    expect(METRIC_TOOLTIPS.totalInvested).toBe(
      "Capital that reached your portfolio: net deposits minus withdrawals, after linked transfer fees.",
    )
  })

  it("labels cash as available USD buy power", () => {
    renderCard()
    expect(screen.getByText("Available USD (buy power)")).toBeInTheDocument()
    expect(screen.queryByText(/^Cash$/)).not.toBeInTheDocument()
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
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(3)
  })
})
