import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData } from "@/lib/types"
import { NetWorthCard } from "./net-worth-card"

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

function renderCard(
  props: {
    initialData?: NetWorthData | null
    fxSnapshot?: { rate: string; date: string } | null
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NetWorthCard initialData={props.initialData ?? baseNetWorth} fxSnapshot={props.fxSnapshot} />
    </QueryClientProvider>,
  )
}

describe("NetWorthCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue(baseNetWorth)
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
    const twrLabel = screen.getByText("Time-weighted return")
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

  it("shows COP conversion with FX rate and date when fxSnapshot is provided", () => {
    renderCard({
      fxSnapshot: { rate: "3674.00", date: "2025-05-24" },
    })
    const copLine = screen.getByText((_, element) => {
      const text = element?.textContent ?? ""
      return (
        element?.tagName === "P" &&
        text.includes("$44,088,000 COP") &&
        text.includes("rate 3,674.00 COP/USD") &&
        text.toLowerCase().includes("may 24")
      )
    })
    expect(copLine).toBeInTheDocument()
  })

  it("exposes tooltip triggers for key metrics", () => {
    renderCard()
    expect(screen.getByRole("button", { name: /about net worth/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about total gain\/loss/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about portfolio value/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about time-weighted return/i })).toBeInTheDocument()
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
