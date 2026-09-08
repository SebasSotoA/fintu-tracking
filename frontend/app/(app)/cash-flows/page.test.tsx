import { describe, expect, it, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import type { Locale } from "@/lib/i18n/types"
import CashFlowsPage from "./page"

const { mockUseSearchParams, mockListCashFlowsPaginated } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockListCashFlowsPaginated: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

vi.mock("@/lib/api/cash-flows", () => ({
  listCashFlowsPaginated: (...args: unknown[]) => mockListCashFlowsPaginated(...args),
}))

vi.mock("@/components/cash-flows/cash-flows-list", () => ({
  CashFlowsList: () => <div data-testid="cash-flows-list">CashFlowsList</div>,
}))

vi.mock("@/components/cash-flows/fx-rate-manager", () => ({
  FxRateManager: () => <div data-testid="fx-rate-manager">FxRateManager</div>,
}))

vi.mock("@/components/cash-flows/lazy-reconciliation-dashboard", () => ({
  LazyReconciliationDashboard: () => (
    <div data-testid="lazy-reconciliation-dashboard">LazyReconciliationDashboard</div>
  ),
}))

function renderPage(locale: Locale = "en") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <CashFlowsPage />
    </QueryClientProvider>,
    { locale },
  )
}

function pendingPromise<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

function expectCashFlowsPageSkeleton(name: string) {
  const status = screen.getByRole("status", { name })
  expect(status.querySelector('[data-testid="table-page-skeleton"]')).not.toBeNull()
  expect(screen.getByTestId("chart-panel-skeleton-plot")).toBeInTheDocument()
  expect(document.querySelector(".animate-spin")).not.toBeInTheDocument()
}

describe("CashFlowsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockListCashFlowsPaginated.mockReturnValue(pendingPromise())
  })

  it("shows CashFlowsPageSkeleton while search params suspend", () => {
    mockUseSearchParams.mockImplementation(() => {
      throw pendingPromise()
    })

    renderPage()

    expectCashFlowsPageSkeleton("Loading")
  })

  it("shows CashFlowsPageSkeleton while cash flows are loading", () => {
    renderPage()

    expectCashFlowsPageSkeleton("Loading")
  })

  it("labels the loading skeleton with the translated table.loading string", () => {
    renderPage("es")

    expectCashFlowsPageSkeleton("Cargando")
  })

  it("renders the cash-flow surfaces after data resolves", async () => {
    mockListCashFlowsPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId("cash-flows-list")).toBeInTheDocument()
    })
    expect(screen.getByTestId("fx-rate-manager")).toBeInTheDocument()
    expect(screen.getByTestId("lazy-reconciliation-dashboard")).toBeInTheDocument()
    expect(screen.queryByTestId("table-page-skeleton")).not.toBeInTheDocument()
  })

  it("calls listCashFlowsPaginated with sort and dir from search params", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("sort=amount&dir=asc"))
    mockListCashFlowsPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })

    renderPage()

    await waitFor(() => {
      expect(mockListCashFlowsPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "amount", dir: "asc", page: 1, page_size: 10 }),
      )
    })
  })

  it("omits sort and dir from the API call when search params are empty", async () => {
    mockListCashFlowsPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })

    renderPage()

    await waitFor(() => {
      expect(mockListCashFlowsPaginated).toHaveBeenCalled()
    })
    const arg = mockListCashFlowsPaginated.mock.calls[0][0] as Record<string, unknown>
    expect(arg).not.toHaveProperty("sort")
    expect(arg).not.toHaveProperty("dir")
  })
})
