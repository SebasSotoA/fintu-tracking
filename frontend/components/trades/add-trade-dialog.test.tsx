import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
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
  searchMarketSymbols: vi.fn(() => Promise.resolve([])),
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
      <QueryClientProvider client={queryClient}>
        <AddTradeDialog autoOpen initialTicker="AAPL" />
      </QueryClientProvider>,
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
})
