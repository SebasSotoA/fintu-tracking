import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TickerSearch } from "./ticker-search"

vi.mock("@/lib/api/portfolio", () => ({
  searchMarketSymbols: vi.fn(),
  getHoldings: vi.fn(() => Promise.resolve([])),
}))

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("TickerSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders combobox trigger button", () => {
    renderWithProviders(<TickerSearch id="ticker" value="" onChange={vi.fn()} />)
    expect(screen.getByRole("combobox", { name: /search ticker/i })).toBeInTheDocument()
  })

  it("typing a query calls search and shows a result", async () => {
    const user = userEvent.setup()
    const { searchMarketSymbols } = await import("@/lib/api/portfolio")
    vi.mocked(searchMarketSymbols).mockResolvedValue([
      { symbol: "AAPL", name: "Apple Inc.", asset_type: "stock" },
    ])

    renderWithProviders(<TickerSearch id="ticker" value="" onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole("combobox", { name: /search ticker/i }))

    const input = screen.getByPlaceholderText("Search ticker...")
    await user.type(input, "aapl")

    await waitFor(
      () => expect(screen.getByText("Apple Inc.")).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  it("clicking a result calls onChange with symbol and asset_type", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { searchMarketSymbols } = await import("@/lib/api/portfolio")
    vi.mocked(searchMarketSymbols).mockResolvedValue([
      { symbol: "AAPL", name: "Apple Inc.", asset_type: "stock" },
    ])

    renderWithProviders(<TickerSearch id="ticker" value="" onChange={onChange} />)

    fireEvent.click(screen.getByRole("combobox", { name: /search ticker/i }))
    const input = screen.getByPlaceholderText("Search ticker...")
    await user.type(input, "aapl")

    await waitFor(() => screen.getByText("Apple Inc."), { timeout: 2000 })
    fireEvent.click(screen.getByText("Apple Inc."))

    expect(onChange).toHaveBeenCalledWith("AAPL", "stock")
  })

  it("crypto result can be selected", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { searchMarketSymbols } = await import("@/lib/api/portfolio")
    vi.mocked(searchMarketSymbols).mockResolvedValue([
      { symbol: "BTC", name: "Bitcoin", asset_type: "crypto" },
    ])

    renderWithProviders(<TickerSearch id="ticker" value="" onChange={onChange} />)

    fireEvent.click(screen.getByRole("combobox", { name: /search ticker/i }))
    const input = screen.getByPlaceholderText("Search ticker...")
    await user.type(input, "btc")

    await waitFor(() => screen.getByText("Bitcoin"), { timeout: 2000 })
    fireEvent.click(screen.getByText("Bitcoin"))

    expect(onChange).toHaveBeenCalledWith("BTC", "crypto")
  })
})
