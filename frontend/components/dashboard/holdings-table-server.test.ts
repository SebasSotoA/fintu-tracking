import { describe, expect, it, vi, beforeEach } from "vitest"
import { ApiError } from "@/lib/api/server-client"
import { fetchHoldingsData } from "./holdings-table-server"

const mockGetHoldingsPaginated = vi.fn()
const mockListMarketPrices = vi.fn()
const mockHandleServerAuthError = vi.fn()

vi.mock("@/lib/api/server-portfolio", () => ({
  getHoldingsPaginated: (params: unknown) => mockGetHoldingsPaginated(params),
  listMarketPrices: () => mockListMarketPrices(),
}))

vi.mock("@/lib/api/server-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/server-client")>()
  return {
    ...original,
    handleServerAuthError: (error: unknown) => mockHandleServerAuthError(error),
  }
})

describe("fetchHoldingsData", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockListMarketPrices.mockResolvedValue([])
    mockHandleServerAuthError.mockImplementation(() => {
      throw new Error("AUTH_REDIRECT")
    })
  })

  it("calls handleServerAuthError for 401 instead of returning empty holdings", async () => {
    mockGetHoldingsPaginated.mockRejectedValue(new ApiError("Unauthorized", 401))

    await expect(fetchHoldingsData(1, 10)).rejects.toThrow("AUTH_REDIRECT")
    expect(mockHandleServerAuthError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401 }),
    )
  })

  it("calls handleServerAuthError for 402 instead of returning empty holdings", async () => {
    mockGetHoldingsPaginated.mockRejectedValue(new ApiError("Payment required", 402))

    await expect(fetchHoldingsData(1, 10)).rejects.toThrow("AUTH_REDIRECT")
    expect(mockHandleServerAuthError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 402 }),
    )
  })

  it("calls handleServerAuthError for 403 instead of returning empty holdings", async () => {
    mockGetHoldingsPaginated.mockRejectedValue(new ApiError("Forbidden", 403))

    await expect(fetchHoldingsData(1, 10)).rejects.toThrow("AUTH_REDIRECT")
    expect(mockHandleServerAuthError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403 }),
    )
  })

  it("rethrows non-auth errors", async () => {
    mockGetHoldingsPaginated.mockRejectedValue(new ApiError("Server error", 500))

    await expect(fetchHoldingsData(1, 10)).rejects.toThrow("Server error")
    expect(mockHandleServerAuthError).not.toHaveBeenCalled()
  })
})
