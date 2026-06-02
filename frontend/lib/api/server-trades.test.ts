import { describe, expect, it, vi, beforeEach } from "vitest"
import { listTrades } from "./server-trades"

vi.mock("./server-client", () => ({
  serverGet: vi.fn(),
}))

import { serverGet } from "./server-client"

const mockServerGet = vi.mocked(serverGet)

describe("listTrades", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockServerGet.mockResolvedValue([])
  })

  it("calls /api/trades with no query when filters are empty", async () => {
    await listTrades()
    expect(mockServerGet).toHaveBeenCalledWith("/api/trades")
  })

  it("serializes filter params into the query string", async () => {
    await listTrades({
      from: "2026-01-01",
      to: "2026-01-31",
      side: "buy",
      asset_type: "stock",
      ticker: "AAPL",
    })
    expect(mockServerGet).toHaveBeenCalledWith(
      "/api/trades?from=2026-01-01&to=2026-01-31&side=buy&asset_type=stock&ticker=AAPL",
    )
  })
})
