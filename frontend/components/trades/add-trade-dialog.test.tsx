import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
}))

vi.mock("@/lib/api/query-keys", () => ({
  invalidateAfterTradeMutation: vi.fn(),
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
      <AddTradeDialog autoOpen={autoOpen} />
    </QueryClientProvider>,
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

  it("submits a buy trade when the form is filled", async () => {
    const user = userEvent.setup()
    const { createTrade } = await import("@/lib/api/trades")
    renderDialog()

    await user.type(screen.getByLabelText("Ticker"), "AAPL")
    await user.type(screen.getByLabelText("Quantity"), "10")
    await user.type(screen.getByLabelText("Price"), "150")

    const submitButton = screen.getByRole("button", { name: "Add Trade" })
    await user.click(submitButton)

    expect(createTrade).toHaveBeenCalled()
  })
})
