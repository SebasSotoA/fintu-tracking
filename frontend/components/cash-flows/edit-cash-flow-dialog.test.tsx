import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, within } from "@testing-library/react"
import type { CashFlow } from "@/lib/types"
import { EditCashFlowDialog } from "./edit-cash-flow-dialog"

vi.mock("@/lib/api/cash-flows", () => ({
  createCashFlow: vi.fn(),
  updateCashFlow: vi.fn(),
  deleteCashFlow: vi.fn(),
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

const depositCashFlow: CashFlow = {
  id: "cf-1",
  user_id: "user-1",
  date: "2024-06-01",
  type: "deposit",
  currency: "COP",
  amount: "400000",
  usd_amount: "100.00",
  fx_rate: "4000",
  broker_id: null,
  fee_type: null,
  notes: null,
  related_trade_id: null,
  related_cash_flow_id: null,
  related_type: null,
  created_at: "2024-06-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
}

function renderEditDialog(cashFlow: CashFlow = depositCashFlow) {
  return render(
    <EditCashFlowDialog
      cashFlow={cashFlow}
      cashFlows={[cashFlow]}
      open
      onOpenChange={() => {}}
      onSuccess={() => {}}
    />,
  )
}

describe("EditCashFlowDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses ResponsiveDialog and ResponsiveDialogContent", () => {
    renderEditDialog()

    const content = screen.getByRole("dialog")
    expect(content).toHaveAttribute("data-slot", "dialog-content")
    expect(content).toHaveClass("max-h-[100dvh]")
    expect(content).toHaveClass("md:max-h-[90vh]")
  })

  it("renders form fields in ResponsiveFormGrid with mobile-first grid classes", () => {
    renderEditDialog()

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
    renderEditDialog()

    const form = screen.getByRole("dialog").querySelector("form")
    expect(form).toBeTruthy()
    const footer = form!.lastElementChild as HTMLElement
    expect(footer).toHaveClass("flex-col")
    expect(footer).toHaveClass("sm:flex-row")
    expect(footer).toHaveClass("sm:justify-end")
  })

  it("shows hero net USD input with deposit amount label for deposits", () => {
    renderEditDialog()

    const netInput = screen.getByLabelText(/Deposit amount/i)
    expect(netInput).toHaveClass("font-mono")
    expect(netInput).toHaveClass("text-3xl")
    expect(screen.queryByText(/USD to receive in Hapi/i)).not.toBeInTheDocument()
  })

  it("uses SingleDatePicker instead of native date input", () => {
    renderEditDialog()

    expect(screen.getByRole("button", { name: /cash flow date/i })).toBeInTheDocument()
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument()
  })

  it("places fee and FX rate side by side", () => {
    renderEditDialog()

    const feeInput = screen.getByLabelText(/Deposit fee USD/i)
    const fxInput = screen.getByLabelText(/FX rate COP\/USD/i)
    const feeRow = feeInput.closest("[data-testid='responsive-form-grid']")
    expect(feeRow).toBeTruthy()
    expect(within(feeRow as HTMLElement).getByLabelText(/FX rate COP\/USD/i)).toBe(fxInput)
  })

  it("shows only subtotal and COP in preview for transfers", () => {
    renderEditDialog()

    expect(screen.getByText(/Subtotal USD \(net \+ fee\)/i)).toBeInTheDocument()
    expect(screen.getByText(/COP to wire/i)).toBeInTheDocument()
    expect(screen.queryByText(/Deposit fee USD:/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Deposit amount/i)).toHaveLength(1)
  })
})
