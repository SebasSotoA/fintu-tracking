import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TickerSearch } from "./ticker-search"

vi.mock("@/lib/api/portfolio", () => ({
  searchMarketSymbols: vi.fn(),
  getHoldings: vi.fn(() => Promise.resolve([])),
}))

// Hoisted so it's available inside the vi.mock factory below.
// Each render updates onOpenChange to the latest handleOpenChange closure so tests
// can invoke it directly to simulate what Radix does in a real browser.
const popoverState = vi.hoisted(() => ({
  onOpenChange: null as ((open: boolean) => void) | null,
}))

vi.mock("@/components/ui/popover", async () => {
  const React = await import("react")
  return {
    Popover: ({
      children,
      onOpenChange,
    }: {
      children: React.ReactNode
      open: boolean
      onOpenChange: (v: boolean) => void
    }) => {
      popoverState.onOpenChange = onOpenChange
      return React.createElement(React.Fragment, null, children)
    },
    PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) =>
      React.createElement(React.Fragment, null, children),
    PopoverContent: ({
      children,
      className,
    }: {
      children: React.ReactNode
      align?: string
      className?: string
    }) => React.createElement("div", { "data-testid": "popover-content", className }, children),
  }
})

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
    popoverState.onOpenChange = null
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

    const input = screen.getByPlaceholderText("Search ticker...")
    await user.type(input, "btc")

    await waitFor(() => screen.getByText("Bitcoin"), { timeout: 2000 })
    fireEvent.click(screen.getByText("Bitcoin"))

    expect(onChange).toHaveBeenCalledWith("BTC", "crypto")
  })

  it("selecting a crypto result calls onChange exactly once with symbol and asset_type — no second freeform call", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { searchMarketSymbols } = await import("@/lib/api/portfolio")
    vi.mocked(searchMarketSymbols).mockResolvedValue([
      { symbol: "BTC", name: "Bitcoin", asset_type: "crypto" },
    ])

    renderWithProviders(<TickerSearch id="ticker" value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText("Search ticker...")
    await user.type(input, "btc")
    await waitFor(() => screen.getByText("Bitcoin"), { timeout: 2000 })

    // Reproduce the real-browser race condition inside act() so React holds its batch:
    // 1. fireEvent.click fires onSelect synchronously → onChange("BTC","crypto") called,
    //    setInputQuery("") + setOpen(false) SCHEDULED but NOT yet committed.
    // 2. popoverState.onOpenChange(false) simulates the Radix DismissableLayer/FocusScope
    //    calling handleOpenChange(false) before the batch commits — the stale closure
    //    still sees inputQuery="btc", so without the fix it calls onChange("BTC") again.
    act(() => {
      fireEvent.click(screen.getByText("Bitcoin"))
      popoverState.onOpenChange?.(false)
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("BTC", "crypto")
  })

  it("renders both results when two items share the same symbol but differ in asset_type", async () => {
    const user = userEvent.setup()
    const { searchMarketSymbols } = await import("@/lib/api/portfolio")
    vi.mocked(searchMarketSymbols).mockResolvedValue([
      { symbol: "ACME", name: "Acme Stock", asset_type: "stock" },
      { symbol: "ACME", name: "Acme ETF", asset_type: "etf" },
    ])

    renderWithProviders(<TickerSearch id="ticker" value="" onChange={vi.fn()} />)

    const input = screen.getByPlaceholderText("Search ticker...")
    await user.type(input, "acme")

    await waitFor(
      () => {
        expect(screen.getByText("Acme Stock")).toBeInTheDocument()
        expect(screen.getByText("Acme ETF")).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it("popover content has trigger-width and min-width classes", () => {
    renderWithProviders(<TickerSearch id="ticker" value="" onChange={vi.fn()} />)
    const popoverContent = screen.getByTestId("popover-content")
    expect(popoverContent.className).toContain("min-w-[18rem]")
    expect(popoverContent.className).toContain("w-[var(--radix-popover-trigger-width)]")
  })
})
