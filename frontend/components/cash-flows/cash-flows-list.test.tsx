import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CashFlow } from "@/lib/types"
import { CashFlowsList } from "./cash-flows-list"

const mockReplace = vi.fn()

vi.mock("@/lib/api/cash-flows", () => ({
  listCashFlowsForExport: () => Promise.resolve([]),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/cash-flows",
  useSearchParams: () => new URLSearchParams(),
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
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
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

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
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
})
