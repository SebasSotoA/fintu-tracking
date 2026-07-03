import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useHoldingsData } from "./use-holdings-data"

const mockGetHoldingsPaginated = vi.fn()
const mockListMarketPrices = vi.fn()

vi.mock("@/lib/api/portfolio", () => ({
  getHoldingsPaginated: (params: unknown) => mockGetHoldingsPaginated(params),
  listMarketPrices: () => mockListMarketPrices(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function TestComponent() {
  const { data } = useHoldingsData(1, 10)
  return <div data-testid="total">{data?.total ?? "loading"}</div>
}

describe("useHoldingsData", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockListMarketPrices.mockResolvedValue([])
    mockGetHoldingsPaginated.mockResolvedValue({
      items: [{ ticker: "AAPL" }],
      total: 1,
      page: 1,
      page_size: 10,
    })
  })

  it("fetches paginated holdings and market prices", async () => {
    const { getByTestId } = render(<TestComponent />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(getByTestId("total")).toHaveTextContent("1")
    })
    expect(mockGetHoldingsPaginated).toHaveBeenCalledWith({ page: 1, page_size: 10 })
    expect(mockListMarketPrices).toHaveBeenCalled()
  })
})
