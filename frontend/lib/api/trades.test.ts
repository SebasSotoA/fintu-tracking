import { describe, expect, it, vi, beforeEach } from "vitest"
import { listTrades, listTradesForExport, listTradesPaginated } from "./trades"

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from "./client"

describe("listTradesPaginated", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns paginated result from API", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [{ id: "t1" }],
      total: 1,
      page: 1,
      page_size: 10,
    })

    const result = await listTradesPaginated({ page: 1, page_size: 10 })

    expect(result.items).toHaveLength(1)
    expect(apiClient.get).toHaveBeenCalledWith("/api/trades?page=1&page_size=10")
  })

  it("includes sort and dir in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })

    await listTradesPaginated({ page: 1, page_size: 10, sort: "ticker", dir: "asc" })

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/trades?page=1&page_size=10&sort=ticker&dir=asc",
    )
  })

  it("slices array response when API returns plain array", async () => {
    const items = Array.from({ length: 15 }, (_, index) => ({ id: `t${index + 1}` }))
    vi.mocked(apiClient.get).mockResolvedValue(items)

    const result = await listTradesPaginated({ page: 2, page_size: 10 })

    expect(result.items).toHaveLength(5)
    expect(result.items[0]).toEqual({ id: "t11" })
    expect(result.total).toBe(15)
  })
})

describe("listTrades", () => {
  it("fetches trades without pagination params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([])

    await listTrades({ ticker: "AAPL" })

    expect(apiClient.get).toHaveBeenCalledWith("/api/trades?ticker=AAPL")
  })
})

describe("listTradesForExport", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("does not pass sort or dir in the export query", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10000,
    })

    await listTradesForExport({ ticker: "AAPL", sort: "ticker", dir: "asc" })

    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).toContain("ticker=AAPL")
    expect(url).not.toContain("sort=")
    expect(url).not.toContain("dir=")
  })
})
