import { describe, expect, it, vi, beforeEach } from "vitest"
import { listTrades, listTradesPaginated } from "./trades"

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
