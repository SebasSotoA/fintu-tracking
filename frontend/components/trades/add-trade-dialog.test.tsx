import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EnglishLocaleWrapper, renderWithLocale } from "@/lib/i18n/test-utils"
import { AddTradeDialog } from "./add-trade-dialog"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/lib/api/trades", () => ({
  createTrade: vi.fn(),
}))

vi.mock("@/lib/api/portfolio", () => ({
  getHoldings: vi.fn(() => Promise.resolve([])),
  getMarketPrice: vi.fn(() => Promise.resolve({ ticker: "AAPL", price: "150.00", currency: "USD", updated_at: "" })),
  searchMarketSymbols: vi.fn(() => Promise.resolve([])),
}))

vi.mock("@/lib/api/query-keys", () => ({
  invalidateAfterTradeMutation: vi.fn(),
}))

vi.mock("@/lib/api/brokers", () => ({
  listBrokers: vi.fn(() => Promise.resolve({ brokers: [], presets: [] })),
}))

vi.mock("@/components/trades/ticker-search", () => ({
  TickerSearch: ({
    id,
    value,
    onChange,
  }: {
    id: string
    value: string
    onChange: (ticker: string, assetType?: string) => void
    disabled?: boolean
  }) => (
    <div data-testid="ticker-search-mock">
      <label htmlFor={id}>Ticker</label>
      <span id={id}>{value}</span>
      <button type="button" data-testid="pick-qqq-etf" onClick={() => onChange("QQQ", "etf")}>
        Pick QQQ ETF
      </button>
      <button type="button" data-testid="use-xyz" onClick={() => onChange("XYZ")}>
        Use XYZ
      </button>
    </div>
  ),
}))

vi.mock("@/components/trades/sell-ticker-select", () => ({
  SellTickerSelect: ({
    onChange,
  }: {
    id: string
    value: string
    onChange: (ticker: string, holding?: { assetType?: string }) => void
    disabled?: boolean
  }) => (
    <div data-testid="sell-ticker-select-mock">
      <button
        type="button"
        data-testid="pick-sell-aapl"
        onClick={() => onChange("AAPL", { assetType: "stock" })}
      >
        Pick AAPL (stock)
      </button>
    </div>
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect?: (date: Date) => void
  }) => (
    <button type="button" data-testid="calendar-pick" onClick={() => onSelect?.(new Date(2024, 5, 15))}>
      Pick
    </button>
  ),
}))

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

function renderDialog(autoOpen = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>
        <AddTradeDialog autoOpen={autoOpen} />
      </QueryClientProvider>
    </EnglishLocaleWrapper>,
  )
}

describe("AddTradeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses ResponsiveDialog and ResponsiveDialogContent", () => {
    renderDialog()

    const content = screen.getByRole("dialog")
    expect(content).toHaveAttribute("data-slot", "dialog-content")
    expect(content).toHaveClass("max-h-[100dvh]")
    expect(content).toHaveClass("md:max-h-[90vh]")
  })

  it("renders form fields in ResponsiveFormGrid with mobile-first grid classes", () => {
    renderDialog()

    const content = screen.getByRole("dialog")
    const grids = within(content).getAllByTestId("responsive-form-grid")
    expect(grids.length).toBeGreaterThan(0)

    // All grids share the base mobile-first classes
    grids.forEach((grid) => {
      expect(grid).toHaveClass("grid-cols-1")
      expect(grid).toHaveClass("gap-4")
    })

    // Date+Ticker and Quantity+Price grids remain 2-column
    const twoColGrids = grids.filter((g) => g.classList.contains("md:grid-cols-2"))
    expect(twoColGrids.length).toBeGreaterThanOrEqual(2)

    // Asset Type, Broker, and Side share a single 3-column grid
    const metadataGrid = grids.find((g) => g.classList.contains("md:grid-cols-3"))
    expect(metadataGrid).toBeTruthy()
    expect(within(metadataGrid!).getByLabelText("Asset Type")).toBeInTheDocument()
    expect(within(metadataGrid!).getByLabelText("Broker")).toBeInTheDocument()
    expect(within(metadataGrid!).getByLabelText("Side")).toBeInTheDocument()
  })

  it("stacks footer buttons on mobile and rows them on desktop", () => {
    renderDialog()

    const dialog = screen.getByRole("dialog")
    const footer = dialog.querySelector(".flex-col-reverse") as HTMLElement
    expect(footer).toBeTruthy()
    expect(footer).toHaveClass("flex-col-reverse")
    expect(footer).toHaveClass("sm:flex-row")
    expect(footer).toHaveClass("sm:justify-end")
    expect(footer).toHaveClass("shrink-0")
    expect(footer).toHaveClass("pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]")
    expect(footer).not.toHaveClass("pb-safe")
  })

  it("submits a buy trade when the form is filled", async () => {
    const user = userEvent.setup()
    const { createTrade } = await import("@/lib/api/trades")
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <EnglishLocaleWrapper>
        <QueryClientProvider client={queryClient}>
          <AddTradeDialog autoOpen initialTicker="AAPL" />
        </QueryClientProvider>
      </EnglishLocaleWrapper>,
    )

    await user.type(screen.getByLabelText("Quantity"), "10")
    await user.type(screen.getByLabelText("Price"), "150")

    const submitButton = screen.getByRole("button", { name: "Add Trade" })
    await user.click(submitButton)

    expect(createTrade).toHaveBeenCalled()
  })

  it("shows Crypto option in asset type select", async () => {
    renderDialog()

    fireEvent.click(screen.getByLabelText("Asset Type"))

    expect(await screen.findByRole("option", { name: "Crypto" })).toBeInTheDocument()
  })

  it("Asset Type SelectTrigger has w-full class", () => {
    renderDialog()
    expect(screen.getByLabelText("Asset Type")).toHaveClass("w-full")
  })

  it("Side SelectTrigger has w-full class", () => {
    renderDialog()
    expect(screen.getByLabelText("Side")).toHaveClass("w-full")
  })

  it("never shows a cached-price warning", () => {
    renderDialog()
    expect(screen.queryByText(/No cached price yet/i)).not.toBeInTheDocument()
  })

  it("Commission label has an About Commission tooltip button", () => {
    renderDialog()
    expect(screen.getByRole("button", { name: /about commission/i })).toBeInTheDocument()
  })

  it("Commission helper text is in a tooltip, not a paragraph under the input", () => {
    renderDialog()
    const matches = screen.queryAllByText("Broker's closing fee per trade")
    const asP = matches.filter((el) => el.tagName === "P")
    expect(asP).toHaveLength(0)
  })

  it("Commission tooltip shows help text when button is hovered", async () => {
    const user = userEvent.setup()
    renderDialog()
    const helpButton = screen.getByRole("button", { name: /about commission/i })
    await user.hover(helpButton)
    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip).toHaveTextContent("Broker's closing fee per trade")
  })

  it("search pick locks Asset Type select to the picked type", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByTestId("pick-qqq-etf"))

    const trigger = screen.getByLabelText("Asset Type")
    expect(trigger).toBeDisabled()
  })

  it("custom Use ticker unlocks Asset Type select and resets to stock", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByTestId("pick-qqq-etf"))
    expect(screen.getByLabelText("Asset Type")).toBeDisabled()

    await user.click(screen.getByTestId("use-xyz"))

    const trigger = screen.getByLabelText("Asset Type")
    expect(trigger).not.toBeDisabled()
  })

  it("sell side: picking from SellTickerSelect locks Asset Type", async () => {
    const user = userEvent.setup()
    renderDialog()

    fireEvent.click(screen.getByLabelText("Side"))
    await waitFor(() => screen.findByRole("option", { name: "Sell" }))
    const sellOption = await screen.findByRole("option", { name: "Sell" })
    fireEvent.click(sellOption)

    await user.click(screen.getByTestId("pick-sell-aapl"))

    expect(screen.getByLabelText("Asset Type")).toBeDisabled()
  })

  it("Asset Type starts unlocked for a new trade", () => {
    renderDialog()
    expect(screen.getByLabelText("Asset Type")).not.toBeDisabled()
  })

  it("shows Spanish dialog title when locale is es", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    renderWithLocale(
      <QueryClientProvider client={queryClient}>
        <AddTradeDialog autoOpen />
      </QueryClientProvider>,
      { locale: "es" },
    )

    expect(screen.getByRole("heading", { name: "Agregar operación" })).toBeInTheDocument()
  })
})
