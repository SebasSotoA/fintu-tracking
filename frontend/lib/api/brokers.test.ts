import { describe, it, expect, vi, beforeEach } from "vitest"
import { listBrokers, createBroker } from "./brokers"
import { apiClient } from "./client"

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe("brokers API", () => {
  const mockBroker = {
    id: "broker-1",
    user_id: "user-1",
    preset_id: "hapi-colombia",
    name: "Hapi",
    country: "co",
    base_currency: "USD",
    local_currency: "COP",
    deposit_fee_type: "percentage",
    deposit_fee_value: "0.009",
    withdrawal_fee_type: "none",
    withdrawal_fee_value: "0",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("listBrokers fetches /api/brokers", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ brokers: [mockBroker], presets: [] })

    const result = await listBrokers()

    expect(apiClient.get).toHaveBeenCalledWith("/api/brokers")
    expect(result.brokers).toHaveLength(1)
  })

  it("createBroker posts /api/brokers", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockBroker)

    const result = await createBroker({ preset_id: "hapi-colombia" })

    expect(apiClient.post).toHaveBeenCalledWith("/api/brokers", { preset_id: "hapi-colombia" })
    expect(result).toEqual(mockBroker)
  })
})
