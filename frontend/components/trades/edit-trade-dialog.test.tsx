import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
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

  it("shows Crypto option in asset type select", async () => {
    renderDialog()

    fireEvent.click(screen.getByLabelText("Asset Type"))

    expect(await screen.findByRole("option", { name: "Crypto" })).toBeInTheDocument()
  })
})
