import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CashFlow } from "@/lib/types"
import { EditCashFlowDialog } from "./edit-cash-flow-dialog"

vi.mock("@/lib/api/cash-flows", () => ({
  createCashFlow: vi.fn(),
  updateCashFlow: vi.fn(),
  deleteCashFlow: vi.fn(),
}))

vi.mock("@/lib/api/brokers", () => ({
  listBrokers: vi.fn(() => Promise.resolve({ brokers: [], presets: [] })),
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditCashFlowDialog
        cashFlow={cashFlow}
        cashFlows={[cashFlow]}
        open
        onOpenChange={() => {}}
        onSuccess={() => {}}
      />
    </QueryClientProvider>,
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

    const threeColGrid = grids.find((g) => g.classList.contains("md:grid-cols-3"))
    expect(threeColGrid).toBeTruthy()
    expect(within(threeColGrid as HTMLElement).getByRole("combobox", { name: /type/i })).toBeInTheDocument()
    expect(within(threeColGrid as HTMLElement).getByRole("button", { name: /cash flow date/i })).toBeInTheDocument()
    expect(within(threeColGrid as HTMLElement).getByText(/^Broker$/)).toBeInTheDocument()

    const twoColGrid = grids.find((g) => g.classList.contains("md:grid-cols-2"))
    expect(twoColGrid).toBeTruthy()
    expect(within(twoColGrid as HTMLElement).getByLabelText(/Deposit fee USD/i)).toBeInTheDocument()
    expect(within(twoColGrid as HTMLElement).getByLabelText(/FX rate COP\/USD/i)).toBeInTheDocument()
  })

  it("stacks footer buttons on mobile and rows them on desktop", () => {
    renderEditDialog()

    const dialog = screen.getByRole("dialog")
    const footer = dialog.querySelector(".flex-col-reverse") as HTMLElement
    expect(footer).toBeTruthy()
    expect(footer).toHaveClass("shrink-0")
    expect(footer).toHaveClass("flex-col-reverse")
    expect(footer).toHaveClass("sm:flex-row")
    expect(footer).toHaveClass("sm:justify-end")
    expect(footer).not.toHaveClass("pb-safe")
    expect(footer).toHaveClass("pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]")
  })

  it("shows hero net USD input with deposit amount label for deposits", () => {
    renderEditDialog()

    const netInput = screen.getByLabelText(/Deposit amount/i)
    expect(netInput).toHaveClass("font-mono")
    expect(netInput).toHaveClass("text-base")
    expect(netInput).not.toHaveClass("text-3xl")
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

  it("deposit edit does not show Cash adjustment in type select", () => {
    renderEditDialog()

    const hiddenSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement
    expect(hiddenSelect).toBeTruthy()
    const optionValues = Array.from(hiddenSelect.options).map((o) => o.value)
    expect(optionValues).not.toContain("cash_adjustment")
  })

  it("shows Total (USD) hero for transfers", () => {
    renderEditDialog()

    expect(screen.getByText(/Total \(USD\)/i)).toBeInTheDocument()
    // Total hero shows a dollar amount (broker auto-fee may adjust from base net)
    expect(screen.getByText(/^\$\d+\.\d{2}$/, { selector: ".font-mono.font-bold" })).toBeInTheDocument()
    expect(screen.queryByText(/Subtotal USD \(net \+ fee\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/COP to wire/i)).not.toBeInTheDocument()
  })
})
