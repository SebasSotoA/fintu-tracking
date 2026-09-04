import { describe, expect, it, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import type { Locale } from "@/lib/i18n/types"
import TradesPage from "./page"

const { mockUseSearchParams, mockListTradesPaginated, mockListTradeTickers } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockListTradesPaginated: vi.fn(),
  mockListTradeTickers: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

vi.mock("@/lib/api/trades", () => ({
  listTradesPaginated: (...args: unknown[]) => mockListTradesPaginated(...args),
  listTradeTickers: () => mockListTradeTickers(),
}))

vi.mock("@/components/trades/trades-list", () => ({
  TradesList: () => <div data-testid="trades-list">TradesList</div>,
}))

function renderPage(locale: Locale = "en") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <TradesPage />
    </QueryClientProvider>,
    { locale },
  )
}

function pendingPromise<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

describe("TradesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockListTradesPaginated.mockReturnValue(pendingPromise())
    mockListTradeTickers.mockReturnValue(pendingPromise())
  })

  it("shows TablePageSkeleton while search params suspend", () => {
    mockUseSearchParams.mockImplementation(() => {
      throw pendingPromise()
    })

    renderPage()

    expect(screen.getByRole("status", { name: "Loading" })).toHaveAttribute(
      "data-testid",
      "table-page-skeleton",
    )
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument()
  })

  it("shows TablePageSkeleton while trades are loading", () => {
    renderPage()

    expect(screen.getByRole("status", { name: "Loading" })).toHaveAttribute(
      "data-testid",
      "table-page-skeleton",
    )
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument()
  })

  it("labels the loading skeleton with the translated table.loading string", () => {
    renderPage("es")

    expect(screen.getByRole("status", { name: "Cargando" })).toHaveAttribute(
      "data-testid",
      "table-page-skeleton",
    )
  })

  it("renders TradesList after trades resolve", async () => {
    mockListTradesPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })
    mockListTradeTickers.mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId("trades-list")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("table-page-skeleton")).not.toBeInTheDocument()
  })
})
