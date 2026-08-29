import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
    <QueryClientProvider client={queryClient}>
      <AddCashFlowDialog autoOpen={autoOpen} />
    </QueryClientProvider>,
  )
}

async function selectCashFlowType(user: ReturnType<typeof userEvent.setup>, type: string) {
  const hiddenSelect = document.querySelector('select[aria-hidden="true"]')
  if (!hiddenSelect) throw new Error("Type select not found")
  await user.selectOptions(hiddenSelect, type)
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

    expect(screen.getAllByText(/Deposit amount/i)).toHaveLength(1)

    const netInput = screen.getByLabelText(/Deposit amount/i)
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

  it("shows Total (USD) hero for transfers", async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByText(/Total \(USD\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/Subtotal USD \(net \+ fee\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/COP to wire/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/Deposit amount/i), "100")
    await user.clear(screen.getByLabelText(/Deposit fee USD/i))
    await user.type(screen.getByLabelText(/Deposit fee USD/i), "1.99")
    await user.type(screen.getByLabelText(/FX rate COP\/USD/i), "4000")

    expect(screen.getByText("$101.99")).toBeInTheDocument()
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
})
