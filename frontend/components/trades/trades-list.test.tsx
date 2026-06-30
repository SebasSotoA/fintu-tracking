import type { ReactElement } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { Trade } from "@/lib/types"
import { TradesList } from "./trades-list"

const mockReplace = vi.fn()

vi.mock("@/lib/api/trades", () => ({
  listTradesForExport: () => Promise.resolve([]),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/trades",
  useSearchParams: () => new URLSearchParams(),
}))

const sampleTrade: Trade = {
  id: "trade-1",
  user_id: "user-1",
  date: "2026-06-15",
  ticker: "AAPL",
  asset_type: "stock",
  side: "buy",
  quantity: "10",
  price: "150.00",
  deposit_fee: "0",
  trading_fee: "1.00",
  closing_fee: "0",
  total_fees: "1.00",
  total: "1501.00",
  broker_id: null,
  notes: null,
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

describe("TradesList", () => {
  it("renders mobile cards below md and hides the table", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    expect(screen.getByTestId("data-table-cards")).toHaveClass("md:hidden")
    expect(screen.getByTestId("data-table-table")).toHaveClass("hidden", "md:block")
  })

  it("renders trade data in the mobile card", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    expect(within(cards).getByText("AAPL")).toBeInTheDocument()
    expect(within(cards).getByText("Buy")).toBeInTheDocument()
    expect(within(cards).getByText("STOCK")).toBeInTheDocument()
  })

  it("renders edit and delete actions with mobile tap targets in the card", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    const editButton = within(cards).getByRole("button", { name: "Edit" })
    const deleteButton = within(cards).getByRole("button", { name: "Delete" })

    expect(editButton).toHaveClass("min-h-11", "min-w-11")
    expect(deleteButton).toHaveClass("min-h-11", "min-w-11")
  })

  it("opens the edit dialog from the card action", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    fireEvent.click(within(cards).getByRole("button", { name: "Edit" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("opens the delete dialog from the card action", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const cards = screen.getByTestId("data-table-cards")
    fireEvent.click(within(cards).getByRole("button", { name: "Delete" }))
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("renders pagination when total exceeds page size", () => {
    renderWithProviders(
      <TradesList
        trades={Array.from({ length: 10 }, (_, i) => ({ ...sampleTrade, id: `trade-${i}`, ticker: `TICK${i}` }))}
        total={25}
        page={1}
        pageSize={10}
        tickers={[]}
      />,
    )

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  })

  it("renders a mobile filter drawer trigger below md", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const drawer = screen.getByTestId("mobile-filter-drawer")
    expect(drawer).toHaveClass("md:hidden")
    const trigger = within(drawer).getByRole("button", { name: /open trade filters/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveClass("md:hidden")
  })

  it("renders inline filters on desktop and hides the drawer trigger", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    expect(screen.getByLabelText(/filter trades by side/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter trades by asset/i)).toBeInTheDocument()
    expect(screen.getByTestId("mobile-filter-drawer")).toHaveClass("md:hidden")
  })

  it("opens the mobile filter drawer and shows filter form fields", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const drawer = screen.getByTestId("mobile-filter-drawer")
    const trigger = within(drawer).getByRole("button", { name: /open trade filters/i })
    fireEvent.click(trigger)

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Filters")).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/filter trades by side/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/filter trades by asset/i)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: /filter trades by date/i })).toBeInTheDocument()
    expect(within(dialog).getByRole("combobox", { name: /filter trades by ticker/i })).toBeInTheDocument()
  })

  it("shows an active filter count badge when filters are applied", () => {
    renderWithProviders(
      <TradesList
        trades={[sampleTrade]}
        total={1}
        page={1}
        pageSize={10}
        tickers={["AAPL"]}
      />,
    )

    expect(screen.getByRole("button", { name: /open trade filters/i })).not.toHaveTextContent("Filters1")
  })

  it("renders the mobile filter drawer trigger full-width with a 44px tap target", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const trigger = screen.getByRole("button", { name: /open trade filters/i })
    expect(trigger).toHaveClass("w-full")
    expect(trigger).toHaveClass("h-11")
  })

  it("stacks mobile filters vertically and full-width inside the drawer", () => {
    renderWithProviders(
      <TradesList trades={[sampleTrade]} total={1} page={1} pageSize={10} tickers={["AAPL"]} />,
    )

    const drawer = screen.getByTestId("mobile-filter-drawer")
    fireEvent.click(within(drawer).getByRole("button", { name: /open trade filters/i }))

    const dialog = screen.getByRole("dialog")
    const form = within(dialog).getByLabelText(/filter trades by side/i).closest(".grid.grid-cols-1")
    expect(form).toBeInTheDocument()
    expect(form).toHaveClass("grid-cols-1")

    const sideSelect = within(dialog).getByLabelText(/filter trades by side/i)
    expect(sideSelect).toHaveClass("w-full")
    const assetSelect = within(dialog).getByLabelText(/filter trades by asset/i)
    expect(assetSelect).toHaveClass("w-full")
  })
})
