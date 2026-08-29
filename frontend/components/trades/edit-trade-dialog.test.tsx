import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { Trade } from "@/lib/types"
import { EditTradeDialog } from "./edit-trade-dialog"

vi.mock("@/lib/api/trades", () => ({
  updateTrade: vi.fn(),
}))

vi.mock("@/lib/api/portfolio", () => ({
  getHoldings: vi.fn(() => Promise.resolve([])),
  getMarketPrice: vi.fn(() => Promise.resolve({ ticker: "AAPL", price: "150.00", currency: "USD", updated_at: "" })),
  searchMarketSymbols: vi.fn(() => Promise.resolve([])),
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

const baseTrade: Trade = {
  id: "trade-1",
  user_id: "user-1",
  date: "2024-06-01",
  ticker: "AAPL",
  asset_type: "stock",
  side: "buy",
  quantity: "10",
  price: "150.00",
  deposit_fee: "0",
  trading_fee: "0",
  closing_fee: "1.00",
  total_fees: "1.00",
  total: "1501.00",
  broker_id: "broker-1",
  notes: "",
  created_at: "2024-06-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
}

function renderDialog(trade: Trade = baseTrade) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditTradeDialog
        trade={trade}
        open
        onOpenChange={() => {}}
        onSuccess={() => {}}
      />
    </QueryClientProvider>,
  )
}

describe("EditTradeDialog", () => {
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

  it("shows Crypto option in asset type select after unlocking", async () => {
    const user = userEvent.setup()
    renderDialog()

    // Asset Type starts locked on edit; unlock it first via custom ticker pick
    await user.click(screen.getByTestId("use-xyz"))

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

  it("does not show Mapped to trading fee text", () => {
    renderDialog()
    expect(screen.queryByText("Mapped to trading fee for this trade.")).not.toBeInTheDocument()
  })

  it("existing trade starts with Asset Type select disabled (locked)", () => {
    renderDialog()
    expect(screen.getByLabelText("Asset Type")).toBeDisabled()
  })

  it("search pick of a new ticker re-locks Asset Type", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByTestId("use-xyz"))
    expect(screen.getByLabelText("Asset Type")).not.toBeDisabled()

    await user.click(screen.getByTestId("pick-qqq-etf"))
    expect(screen.getByLabelText("Asset Type")).toBeDisabled()
  })

  it("custom Use ticker unlocks Asset Type select", async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByLabelText("Asset Type")).toBeDisabled()

    await user.click(screen.getByTestId("use-xyz"))

    expect(screen.getByLabelText("Asset Type")).not.toBeDisabled()
  })
})
