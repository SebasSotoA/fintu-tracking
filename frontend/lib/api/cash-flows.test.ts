import { describe, expect, it, vi, beforeEach } from "vitest"
import { listCashFlowsForExport, listCashFlowsPaginated } from "./cash-flows"

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from "./client"

describe("listCashFlowsPaginated", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns paginated result from API", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [{ id: "cf1" }],
      total: 1,
      page: 1,
      page_size: 10,
    })

    const result = await listCashFlowsPaginated({ page: 1, page_size: 10 })

    expect(result.items).toHaveLength(1)
    expect(apiClient.get).toHaveBeenCalledWith("/api/cash-flows?page=1&page_size=10")
  })

  it("includes sort and dir in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    })

    await listCashFlowsPaginated({ page: 1, page_size: 10, sort: "amount", dir: "asc" })

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/cash-flows?page=1&page_size=10&sort=amount&dir=asc",
    )
  })
})

describe("listCashFlowsForExport", () => {
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

    await listCashFlowsForExport()

    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).not.toContain("sort=")
    expect(url).not.toContain("dir=")
  })
})
