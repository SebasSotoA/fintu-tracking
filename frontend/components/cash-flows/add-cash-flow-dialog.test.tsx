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

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AddCashFlowDialog />
    </QueryClientProvider>,
  )
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /add cash flow/i }))
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

  it("shows hero net USD input first for deposits with deposit amount label", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openDialog(user)

    expect(screen.getAllByText(/Deposit amount/i)).toHaveLength(1)

    const netInput = screen.getByLabelText(/Deposit amount/i)
    expect(netInput).toHaveClass("font-mono")
    expect(netInput).toHaveClass("text-3xl")

    const typeSelect = screen.getByRole("combobox", { name: "Type" })
    const formElement = netInput.closest("form")!
    const children = Array.from(formElement.children)
    const heroIndex = children.findIndex((el) => el.contains(netInput))
    const typeIndex = children.findIndex((el) => el.contains(typeSelect))
    expect(heroIndex).toBeLessThan(typeIndex)
  })

  it("uses withdrawal debited label for hero net USD input", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openDialog(user)

    await selectCashFlowType(user, "withdrawal")

    expect(screen.getByLabelText(/USD debited from broker/i)).toBeInTheDocument()
    expect(screen.queryByText(/USD to receive in Hapi/i)).not.toBeInTheDocument()
  })

  it("uses SingleDatePicker for date and places fee and FX side by side", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openDialog(user)

    expect(screen.getByRole("button", { name: /cash flow date/i })).toBeInTheDocument()
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument()

    const feeInput = screen.getByLabelText(/Deposit fee USD/i)
    const fxInput = screen.getByLabelText(/FX rate COP\/USD/i)
    const feeRow = feeInput.closest(".grid")
    expect(feeRow).toBeTruthy()
    expect(within(feeRow as HTMLElement).getByLabelText(/FX rate COP\/USD/i)).toBe(fxInput)
  })

  it("shows only subtotal and COP preview lines for transfers", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openDialog(user)

    await user.type(screen.getByLabelText(/Deposit amount/i), "100")
    await user.type(screen.getByLabelText(/Deposit fee USD/i), "1.99")
    await user.type(screen.getByLabelText(/FX rate COP\/USD/i), "4000")

    expect(screen.getByText(/Subtotal USD \(net \+ fee\)/i)).toBeInTheDocument()
    expect(screen.getByText(/COP to wire/i)).toBeInTheDocument()
    expect(screen.queryByText(/Deposit fee USD:/i)).not.toBeInTheDocument()

    const previewLines = screen.getAllByText(/Subtotal USD \(net \+ fee\)|COP to wire/i)
    expect(previewLines).toHaveLength(2)
  })

  it("shows hero-styled USD amount for cash adjustment", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openDialog(user)

    await selectCashFlowType(user, "cash_adjustment")

    const amountInput = screen.getByLabelText(/Amount \(USD\)/i)
    expect(amountInput).toHaveClass("font-mono")
    expect(amountInput).toHaveClass("text-3xl")
    expect(screen.getByText("$")).toBeInTheDocument()
    expect(screen.queryByText(/^USD amount$/)).not.toBeInTheDocument()
  })
})
