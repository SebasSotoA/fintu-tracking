import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import type { CashFlow } from "@/lib/types"
import { CashFlowsList } from "./cash-flows-list"

const { mockReplace, mockUseSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockUseSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock("@/lib/api/cash-flows", () => ({
  listCashFlowsForExport: () => Promise.resolve([]),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/cash-flows",
  useSearchParams: () => mockUseSearchParams(),
}))

const sampleCashFlow: CashFlow = {
  id: "cf-1",
  user_id: "user-1",
  date: "2026-06-15",
  type: "deposit",
  currency: "COP",
  amount: "5000000",
  fx_rate: "4000",
  usd_amount: "1250.00",
  broker_id: null,
  notes: "Initial deposit",
  fee_type: null,
  related_trade_id: null,
  related_cash_flow_id: null,
  related_type: "standalone",
  created_at: "2026-06-15T10:00:00Z",
  updated_at: "2026-06-15T10:00:00Z",
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </EnglishLocaleWrapper>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
})

describe("CashFlowsList", () => {
  it("renders mobile cards below md and hides the table", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    expect(screen.getByTestId("data-table-cards")).toHaveClass("md:hidden")
    expect(screen.getByTestId("data-table-table")).toHaveClass("hidden", "md:block")
  })

  it("renders cash flow data in the mobile card", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    expect(within(cards).getByText("Deposit")).toBeInTheDocument()
    expect(within(cards).getByText("Standalone")).toBeInTheDocument()
    expect(within(cards).getByText("Initial deposit")).toBeInTheDocument()
  })

  it("styles the fee type badge with destructive tokens, not primary green", () => {
    const feeFlow: CashFlow = {
      ...sampleCashFlow,
      id: "cf-fee",
      type: "fee",
      currency: "USD",
      amount: "1.99",
      fx_rate: null,
      usd_amount: "1.99",
      notes: null,
      fee_type: "other",
    }
    renderWithProviders(
      <CashFlowsList cashFlows={[feeFlow]} total={1} page={1} pageSize={10} />,
    )

    const badge = within(screen.getByTestId("data-table-cards")).getByText((_, element) => {
      return element?.tagName === "SPAN" && element.textContent === "Fee"
    })
    expect(badge).toHaveClass("bg-destructive/15", "text-destructive")
    expect(badge.className).toContain("ring-inset")
    expect(badge.className).toContain("ring-destructive")
    expect(badge).not.toHaveClass("text-primary")
  })

  it("renders edit and delete actions with mobile tap targets in the card", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    const editButton = within(cards).getByRole("button", { name: "Edit" })
    const deleteButton = within(cards).getByRole("button", { name: "Delete" })

    expect(editButton).toHaveClass("min-h-11", "min-w-11")
    expect(deleteButton).toHaveClass("min-h-11", "min-w-11")
  })

  it("opens the edit dialog from the card action", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    fireEvent.click(within(cards).getByRole("button", { name: "Edit" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("opens the delete dialog from the card action", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    fireEvent.click(within(cards).getByRole("button", { name: "Delete" }))
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("renders pagination when total exceeds page size", () => {
    renderWithProviders(
      <CashFlowsList
        cashFlows={Array.from({ length: 10 }, (_, i) => ({ ...sampleCashFlow, id: `cf-${i}` }))}
        total={25}
        page={1}
        pageSize={10}
      />,
    )

    expect(screen.getByText("Showing 10 of 25 cash flows")).toBeInTheDocument()
  })

  it("renders a mobile filter drawer trigger below md", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const drawer = screen.getByTestId("mobile-filter-drawer")
    expect(drawer).toHaveClass("md:hidden")
    const trigger = within(drawer).getByRole("button", { name: /open cash flow filters/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveClass("md:hidden")
  })

  it("renders inline filters on desktop and hides the drawer trigger", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    expect(screen.getByLabelText(/filter cash flows by type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter cash flows by currency/i)).toBeInTheDocument()
    expect(screen.getByTestId("mobile-filter-drawer")).toHaveClass("md:hidden")
  })

  it("opens the mobile filter drawer and shows filter form fields", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const drawer = screen.getByTestId("mobile-filter-drawer")
    const trigger = within(drawer).getByRole("button", { name: /open cash flow filters/i })
    fireEvent.click(trigger)

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Filters")).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/filter cash flows by type/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/filter cash flows by currency/i)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: /filter cash flows by date/i })).toBeInTheDocument()
  })

  it("renders the mobile filter drawer trigger full-width with a 44px tap target", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const trigger = screen.getByRole("button", { name: /open cash flow filters/i })
    expect(trigger).toHaveClass("w-full")
    expect(trigger).toHaveClass("h-11")
  })

  it("stacks mobile filters vertically and full-width inside the drawer", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const drawer = screen.getByTestId("mobile-filter-drawer")
    const trigger = within(drawer).getByRole("button", { name: /open cash flow filters/i })
    fireEvent.click(trigger)

    const dialog = screen.getByRole("dialog")
    const form = within(dialog).getByLabelText(/filter cash flows by type/i).closest(".grid.grid-cols-1")
    expect(form).toBeInTheDocument()
    expect(form).toHaveClass("grid-cols-1")

    const typeSelect = within(dialog).getByLabelText(/filter cash flows by type/i)
    expect(typeSelect).toHaveClass("w-full")
    const currencySelect = within(dialog).getByLabelText(/filter cash flows by currency/i)
    expect(currencySelect).toHaveClass("w-full")
  })

  it("does not render a Show trade fee audit rows button", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    expect(screen.queryByRole("button", { name: /show.*fee.*audit/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/show trade fee audit rows/i)).not.toBeInTheDocument()
  })

  it("gives the Export button the shared surface chrome", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const exportButton = screen.getByRole("button", { name: /export/i })
    expect(exportButton).toHaveClass("bg-card")
    expect(exportButton).not.toHaveClass("bg-background")
  })

  it("Add Cash Flow button is visible in the toolbar when list has rows", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    expect(screen.getByRole("button", { name: /add cash flow/i })).toBeInTheDocument()
  })

  it("View button precedes Add Cash Flow button in DOM order", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const allButtons = screen.getAllByRole("button")
    const viewIndex = allButtons.findIndex((b) => b.textContent?.includes("View"))
    const addIndex = allButtons.findIndex((b) => b.textContent?.includes("Add Cash Flow"))
    expect(viewIndex).toBeGreaterThanOrEqual(0)
    expect(addIndex).toBeGreaterThanOrEqual(0)
    expect(viewIndex).toBeLessThan(addIndex)
  })

  it("hides the Notes table column by default and shows it from View", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const table = screen.getByTestId("data-table-table")
    expect(within(table).queryByRole("columnheader", { name: "Notes" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /View/i }))
    fireEvent.click(screen.getByRole("option", { name: /Notes/i }))

    expect(within(table).getByRole("columnheader", { name: "Notes" })).toBeInTheDocument()
    expect(within(table).getByText("Initial deposit")).toBeInTheDocument()
  })

  it("clicking the Date header updates the URL sort and resets page to 1", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("page=3&page_size=10"))
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={3} pageSize={10} />,
    )

    const table = screen.getByTestId("data-table-table")
    fireEvent.click(within(table).getByRole("button", { name: "Date" }))

    expect(mockReplace).toHaveBeenCalled()
    const url = String(mockReplace.mock.calls[0][0])
    expect(url).toContain("sort=date")
    expect(url).toContain("dir=asc")
    expect(url).toContain("page=1")
  })

  it("maps COP wired, FX, and USD net headers to API sort fields", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const table = screen.getByTestId("data-table-table")
    fireEvent.click(within(table).getByRole("button", { name: "COP wired" }))
    expect(String(mockReplace.mock.calls[0][0])).toContain("sort=amount")

    mockReplace.mockClear()
    fireEvent.click(within(table).getByRole("button", { name: "FX" }))
    expect(String(mockReplace.mock.calls[0][0])).toContain("sort=fx_rate")

    mockReplace.mockClear()
    fireEvent.click(within(table).getByRole("button", { name: "USD (net)" }))
    expect(String(mockReplace.mock.calls[0][0])).toContain("sort=usd_amount")
  })

  it("does not make fee, attribution, notes, or actions headers sortable", () => {
    renderWithProviders(
      <CashFlowsList cashFlows={[sampleCashFlow]} total={1} page={1} pageSize={10} />,
    )

    const table = screen.getByTestId("data-table-table")
    expect(within(table).queryByRole("button", { name: "Fee" })).not.toBeInTheDocument()
    expect(within(table).queryByRole("button", { name: "Attribution" })).not.toBeInTheDocument()
    expect(within(table).queryByRole("button", { name: "Actions" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /View/i }))
    fireEvent.click(screen.getByRole("option", { name: /Notes/i }))
    expect(within(table).queryByRole("button", { name: "Notes" })).not.toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Notes" })).toBeInTheDocument()
  })
})
