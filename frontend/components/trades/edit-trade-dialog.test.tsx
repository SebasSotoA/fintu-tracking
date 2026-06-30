import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, within } from "@testing-library/react"
import type { Trade } from "@/lib/types"
import { EditTradeDialog } from "./edit-trade-dialog"

vi.mock("@/lib/api/trades", () => ({
  updateTrade: vi.fn(),
}))

vi.mock("@/lib/api/portfolio", () => ({
  getHoldings: vi.fn(() => Promise.resolve([])),
  getMarketPrice: vi.fn(() => Promise.resolve({ ticker: "AAPL", price: "150.00", currency: "USD", updated_at: "" })),
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
  return render(
    <EditTradeDialog
      trade={trade}
      open
      onOpenChange={() => {}}
      onSuccess={() => {}}
    />,
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
    grids.forEach((grid) => {
      expect(grid).toHaveClass("grid-cols-1")
      expect(grid).toHaveClass("md:grid-cols-2")
      expect(grid).toHaveClass("gap-4")
    })
  })

  it("stacks footer buttons on mobile and rows them on desktop", () => {
    renderDialog()

    const form = screen.getByRole("dialog").querySelector("form")
    expect(form).toBeTruthy()
    const footer = form!.lastElementChild as HTMLElement
    expect(footer).toHaveClass("flex-col")
    expect(footer).toHaveClass("sm:flex-row")
    expect(footer).toHaveClass("sm:justify-end")
  })
})
