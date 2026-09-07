import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import type { CashFlow } from "@/lib/types"
import { createCashFlow } from "@/lib/api/cash-flows"
import { AddCashFlowDialog } from "./add-cash-flow-dialog"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/lib/api/cash-flows", () => ({
  createCashFlow: vi.fn(),
}))

vi.mock("@/lib/api/query-keys", () => ({
  invalidateAfterCashFlowMutation: vi.fn(),
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

function renderDialog(autoOpen = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>
        <AddCashFlowDialog autoOpen={autoOpen} />
      </QueryClientProvider>
    </EnglishLocaleWrapper>,
  )
}

async function selectCashFlowType(user: ReturnType<typeof userEvent.setup>, type: string) {
  const hiddenSelect = document.querySelector('select[aria-hidden="true"]')
  if (!hiddenSelect) throw new Error("Type select not found")
  await user.selectOptions(hiddenSelect, type)
}

function depositAmountInput() {
  return screen.getByRole("spinbutton", { name: /^Deposit amount$/i })
}

function createdCashFlow(overrides: Partial<CashFlow> = {}): CashFlow {
  return {
    id: "cf-new",
    user_id: "user-1",
    date: "2024-06-15",
    type: "deposit",
    currency: "COP",
    amount: "403600.00",
    usd_amount: "100.90",
    fx_rate: "4000",
    broker_id: "hapi-colombia",
    fee_type: null,
    notes: null,
    related_trade_id: null,
    related_cash_flow_id: null,
    related_type: null,
    created_at: "2024-06-15T00:00:00Z",
    updated_at: "2024-06-15T00:00:00Z",
    ...overrides,
  }
}

describe("AddCashFlowDialog", () => {
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
    renderDialog()

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

  it("shows hero net USD input first for deposits with deposit amount label", () => {
    renderDialog()

    expect(screen.getAllByText(/^Deposit amount$/i)).toHaveLength(1)

    const netInput = depositAmountInput()
    expect(netInput).toHaveClass("font-mono")
    expect(netInput).toHaveClass("text-base")
    expect(netInput).not.toHaveClass("text-3xl")

    const typeSelect = screen.getByRole("combobox", { name: "Type" })
    const formElement = netInput.closest("form")!
    const children = Array.from(formElement.children)
    const heroIndex = children.findIndex((el) => el.contains(netInput))
    const typeIndex = children.findIndex((el) => el.contains(typeSelect))
    // Type select comes first (before the hero input)
    expect(typeIndex).toBeLessThan(heroIndex)
  })

  it("uses withdrawal debited label for hero net USD input", async () => {
    const user = userEvent.setup()
    renderDialog()

    await selectCashFlowType(user, "withdrawal")

    expect(screen.getByLabelText(/USD debited from broker/i)).toBeInTheDocument()
    expect(screen.queryByText(/USD to receive in Hapi/i)).not.toBeInTheDocument()
  })

  it("uses SingleDatePicker for date and places fee and FX side by side", async () => {
    renderDialog()

    expect(screen.getByRole("button", { name: /cash flow date/i })).toBeInTheDocument()
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument()

    const feeInput = screen.getByLabelText(/Deposit fee USD/i)
    const fxInput = screen.getByLabelText(/FX rate COP\/USD/i)
    const feeRow = feeInput.closest("[data-testid='responsive-form-grid']")
    expect(feeRow).toBeTruthy()
    expect(within(feeRow as HTMLElement).getByLabelText(/FX rate COP\/USD/i)).toBe(fxInput)
  })

  it("shows Subtotal (USD) for transfers without a local COP readout", async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByText(/Subtotal \(USD\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/Local amount \(COP\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Total (USD)")).not.toBeInTheDocument()
    expect(screen.queryByText(/Subtotal USD \(net \+ fee\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/COP to wire/i)).not.toBeInTheDocument()

    const feeInput = screen.getByLabelText(/Deposit fee USD/i)
    const usdToggle = screen.getByRole("radio", { name: /fee in dollars/i })
    const percentToggle = screen.getByRole("radio", { name: /fee as percent/i })
    const feeWrapper = feeInput.closest(".border")
    expect(feeWrapper).toBeTruthy()
    expect(feeWrapper!.contains(feeInput)).toBe(true)
    expect(feeWrapper!.contains(usdToggle)).toBe(true)
    expect(feeWrapper!.contains(percentToggle)).toBe(true)

    await user.type(depositAmountInput(), "100")
    await user.type(feeInput, "1.99")
    await user.type(screen.getByLabelText(/FX rate COP\/USD/i), "4000")

    expect(screen.getByText("$101.99")).toBeInTheDocument()
    expect(screen.queryByText("407960.00")).not.toBeInTheDocument()
  })

  it("shows a tooltip explaining deposit amount is USD credited at the broker", async () => {
    const user = userEvent.setup()
    renderDialog()

    const helpButton = screen.getByRole("button", { name: /about deposit amount/i })
    await user.hover(helpButton)
    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip).toHaveTextContent(/USD credited at the broker/i)
    expect(tooltip).toHaveTextContent(/COP is not typed/i)
  })

  it("does not auto-fill the fee when typing a deposit amount", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(depositAmountInput(), "100")
    expect(screen.getByLabelText(/Deposit fee USD/i)).toHaveValue(null)
  })

  it("converts a 0.9% fee of 100 USD to a 0.90 USD subtotal", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(depositAmountInput(), "100")
    await user.click(screen.getByRole("radio", { name: /fee as percent/i }))
    await user.type(screen.getByLabelText(/Deposit fee %/i), "0.9")
    await user.type(screen.getByLabelText(/FX rate COP\/USD/i), "4000")

    expect(screen.getByText("$100.90")).toBeInTheDocument()
    expect(screen.queryByText("403600.00")).not.toBeInTheDocument()
    expect(screen.getByText("≈ $0.90")).toBeInTheDocument()
  })

  it("names the fee unit group and relabels the fee field in percent mode", async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByRole("radiogroup", { name: /fee unit/i })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /fee in dollars/i })).toHaveAttribute("data-state", "on")

    await user.click(screen.getByRole("radio", { name: /fee as percent/i }))
    expect(screen.getByLabelText(/Deposit fee %/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Deposit fee USD/i)).not.toBeInTheDocument()
  })

  it("submits a percent fee as a USD fee cash flow", async () => {
    const user = userEvent.setup()
    vi.mocked(createCashFlow).mockResolvedValue(createdCashFlow())
    renderDialog()

    await user.type(depositAmountInput(), "100")
    await user.click(screen.getByRole("radio", { name: /fee as percent/i }))
    await user.type(screen.getByLabelText(/Deposit fee %/i), "0.9")
    await user.type(screen.getByLabelText(/FX rate COP\/USD/i), "4000")

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Add Cash Flow$/i }))

    await waitFor(() => {
      expect(createCashFlow).toHaveBeenCalledTimes(2)
    })

    expect(createCashFlow).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "deposit",
        currency: "COP",
        amount: "403600.00",
        fx_rate: "4000",
      }),
    )
    expect(createCashFlow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "fee",
        currency: "USD",
        amount: "0.90",
      }),
    )
  })

  it("type select does not include Cash adjustment option", () => {
    renderDialog()

    // Description must not mention cash adjustment
    const description = document.querySelector('[data-slot="dialog-description"]')
    expect(description?.textContent).not.toMatch(/cash adjustment/i)

    // The hidden native select must not expose cash_adjustment
    const hiddenSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement
    expect(hiddenSelect).toBeTruthy()
    const optionValues = Array.from(hiddenSelect.options).map((o) => o.value)
    expect(optionValues).not.toContain("cash_adjustment")
  })

  it("forwards data-tour onto the trigger button", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <EnglishLocaleWrapper>
        <QueryClientProvider client={queryClient}>
          <AddCashFlowDialog data-tour="add-cash" />
        </QueryClientProvider>
      </EnglishLocaleWrapper>,
    )

    expect(screen.getByRole("button", { name: /Add Cash Flow/i })).toHaveAttribute(
      "data-tour",
      "add-cash",
    )
  })
})
