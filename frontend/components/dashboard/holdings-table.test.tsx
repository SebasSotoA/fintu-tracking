import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { Holding } from "@/lib/types"
import { HoldingsTable } from "./holdings-table"
import { HoldingsTableServer } from "./holdings-table-server"

const mockGetHoldings = vi.fn()
const mockListMarketPrices = vi.fn()

vi.mock("@/lib/api/server-portfolio", () => ({
  getHoldings: () => mockGetHoldings(),
  listMarketPrices: () => mockListMarketPrices(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const sampleHolding: Holding = {
  ticker: "AAPL",
  quantity: "10",
  avgCost: "150.00",
  totalInvested: "1500.00",
  marketValue: "1800.00",
  unrealizedPL: "300.00",
  unrealizedPLPercent: "20.00",
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("HoldingsTable", () => {
  it("renders empty state when there are no holdings", () => {
    renderWithProviders(<HoldingsTable holdings={[]} />)
    expect(screen.getByText("No holdings yet")).toBeInTheDocument()
  })

  it("renders holdings rows sorted by market value", () => {
    const holdings: Holding[] = [
      { ...sampleHolding, ticker: "MSFT", marketValue: "500.00" },
      { ...sampleHolding, ticker: "AAPL", marketValue: "1800.00" },
    ]
    renderWithProviders(<HoldingsTable holdings={holdings} />)
    const rows = screen.getAllByRole("row")
    expect(rows[1]).toHaveTextContent("AAPL")
    expect(rows[2]).toHaveTextContent("MSFT")
  })

  it("links ticker to filtered trades page", () => {
    renderWithProviders(<HoldingsTable holdings={[sampleHolding]} />)
    const link = screen.getByRole("link", { name: "AAPL" })
    expect(link).toHaveAttribute("href", "/trades?ticker=AAPL")
  })

  it("shows price as-of text when timestamp is available", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        priceUpdatedAtByTicker={{ AAPL: "2026-06-12T10:00:00Z" }}
        lastPriceRefreshAt="2026-06-12T10:05:00Z"
      />,
    )
    expect(screen.getByText(/Prices as of/i)).toBeInTheDocument()
  })

  it("warns when price timestamps are stale", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        priceUpdatedAtByTicker={{ AAPL: "2020-01-01T00:00:00Z" }}
      />,
    )
    expect(screen.getByText(/Some prices are stale/i)).toBeInTheDocument()
  })
})

describe("HoldingsTableServer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListMarketPrices.mockResolvedValue([])
  })

  it("fetches holdings and renders the table", async () => {
    mockGetHoldings.mockResolvedValue([sampleHolding])
    const ui = await HoldingsTableServer()
    renderWithProviders(ui)
    expect(mockGetHoldings).toHaveBeenCalled()
    expect(screen.getByText("AAPL")).toBeInTheDocument()
    expect(screen.getByText("Current Holdings")).toBeInTheDocument()
  })

  it("renders empty state when fetch fails", async () => {
    mockGetHoldings.mockRejectedValue(new Error("network"))
    const ui = await HoldingsTableServer()
    renderWithProviders(ui)
    expect(screen.getByText("No holdings yet")).toBeInTheDocument()
  })
})
