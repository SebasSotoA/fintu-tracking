import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { Holding } from "@/lib/types"
import { HoldingsTable } from "./holdings-table"
import { HoldingsTableServer } from "./holdings-table-server"

const mockGetHoldingsPaginated = vi.fn()
const mockListMarketPrices = vi.fn()
const mockReplace = vi.fn()

vi.mock("@/lib/api/server-portfolio", () => ({
  getHoldingsPaginated: (params: unknown) => mockGetHoldingsPaginated(params),
  listMarketPrices: () => mockListMarketPrices(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
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

beforeEach(() => {
  vi.clearAllMocks()
  mockListMarketPrices.mockResolvedValue([])
})

describe("HoldingsTable", () => {
  it("renders empty state with CTAs when there are no holdings", () => {
    renderWithProviders(
      <HoldingsTable holdings={[]} total={0} page={1} pageSize={10} />,
    )
    expect(screen.getByText("No holdings yet")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add trade/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add cash flow/i })).toBeInTheDocument()
  })

  it("renders holdings rows", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        total={1}
        page={1}
        pageSize={10}
      />,
    )
    const table = screen.getByTestId("data-table-table")
    expect(within(table).getByText("AAPL")).toBeInTheDocument()
    expect(screen.getByText("Current Holdings")).toBeInTheDocument()
  })

  it("links ticker to filtered trades page", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        total={1}
        page={1}
        pageSize={10}
      />,
    )
    const table = screen.getByTestId("data-table-table")
    const link = within(table).getByRole("link", { name: "AAPL" })
    expect(link).toHaveAttribute("href", "/trades?ticker=AAPL")
  })

  it("shows price as-of text when timestamp is available", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        total={1}
        page={1}
        pageSize={10}
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
        total={1}
        page={1}
        pageSize={10}
        priceUpdatedAtByTicker={{ AAPL: "2020-01-01T00:00:00Z" }}
      />,
    )
    expect(screen.getByText(/Some prices are stale/i)).toBeInTheDocument()
  })

  it("renders pagination controls when total exceeds page size", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={Array.from({ length: 10 }, (_, i) => ({
          ...sampleHolding,
          ticker: `TICK${i}`,
        }))}
        total={25}
        page={1}
        pageSize={10}
      />,
    )
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  })

  it("updates the URL when changing page", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={Array.from({ length: 10 }, (_, i) => ({
          ...sampleHolding,
          ticker: `TICK${i}`,
        }))}
        total={25}
        page={1}
        pageSize={10}
      />,
    )
    const nextButton = screen.getByRole("button", { name: "Next page" })
    fireEvent.click(nextButton)
    expect(mockReplace).toHaveBeenCalledWith("/dashboard?page=2&page_size=10", {
      scroll: false,
    })
  })

  it("quick-trade button calls onQuickTrade", () => {
    const onQuickTrade = vi.fn()
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        total={1}
        page={1}
        pageSize={10}
        onQuickTrade={onQuickTrade}
      />,
    )
    const table = screen.getByTestId("data-table-table")
    const button = within(table).getByRole("button", { name: "Quick buy AAPL" })
    fireEvent.click(button)
    expect(onQuickTrade).toHaveBeenCalledWith("AAPL", "stock")
  })

  it("renders mobile cards below md and hides the table", () => {
    renderWithProviders(
      <HoldingsTable holdings={[sampleHolding]} total={1} page={1} pageSize={10} />,
    )

    expect(screen.getByTestId("data-table-cards")).toHaveClass("md:hidden")
    expect(screen.getByTestId("data-table-table")).toHaveClass("hidden", "md:block")
  })

  it("renders the quick-trade button as a large mobile tap target in the card", () => {
    renderWithProviders(
      <HoldingsTable
        holdings={[sampleHolding]}
        total={1}
        page={1}
        pageSize={10}
        onQuickTrade={vi.fn()}
      />,
    )

    const cards = screen.getByTestId("data-table-cards")
    const button = within(cards).getByRole("button", { name: "Quick buy AAPL" })
    expect(button).toHaveClass("min-h-11", "min-w-11")
  })
})

describe("HoldingsTableServer", () => {
  it("fetches paginated holdings and renders the table", async () => {
    mockGetHoldingsPaginated.mockResolvedValue({
      items: [sampleHolding],
      total: 1,
      page: 1,
      page_size: 10,
    })
    const ui = await HoldingsTableServer({ page: 1, pageSize: 10 })
    renderWithProviders(ui)
    expect(mockGetHoldingsPaginated).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
    })
    const table = screen.getByTestId("data-table-table")
    expect(within(table).getByText("AAPL")).toBeInTheDocument()
  })

  it("rethrows when fetch fails with a non-auth error", async () => {
    mockGetHoldingsPaginated.mockRejectedValue(new Error("network"))

    await expect(HoldingsTableServer({ page: 1, pageSize: 10 })).rejects.toThrow("network")
  })
})
