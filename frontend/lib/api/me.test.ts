import { describe, it, expect, vi, beforeEach } from "vitest"
import { getMe, updateOnboarding, updateProfile } from "./me"
import { apiClient } from "./client"

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

describe("me API", () => {
  const mockProfile = {
    id: "profile-1",
    user_id: "user-1",
    country: "co",
    broker_preset_id: "hapi-colombia",
    onboarding_completed: false,
    onboarding_step: "welcome",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("getMe fetches /api/me", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockProfile)

    const result = await getMe()

    expect(apiClient.get).toHaveBeenCalledWith("/api/me")
    expect(result).toEqual(mockProfile)
  })

  it("updateOnboarding patches /api/me/onboarding", async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ ...mockProfile, onboarding_completed: true })

    const result = await updateOnboarding({ country: "co", broker_preset_id: "hapi-colombia" })

    expect(apiClient.patch).toHaveBeenCalledWith("/api/me/onboarding", {
      country: "co",
      broker_preset_id: "hapi-colombia",
    })
    expect(result.onboarding_completed).toBe(true)
  })

  it("updateProfile patches /api/me/profile", async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ ...mockProfile, country: "mx" })

    const result = await updateProfile({ country: "mx", broker_preset_id: "hapi-colombia" })

    expect(apiClient.patch).toHaveBeenCalledWith("/api/me/profile", {
      country: "mx",
      broker_preset_id: "hapi-colombia",
    })
    expect(result.country).toBe("mx")
  })

  it("updateProfile can send a locale-only body", async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ ...mockProfile, locale: "es" })

    const result = await updateProfile({ locale: "es" })

    expect(apiClient.patch).toHaveBeenCalledWith("/api/me/profile", { locale: "es" })
    expect(result.locale).toBe("es")
  })

  it("getMe returns locale as en, es, or null", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ ...mockProfile, locale: null })

    const unset = await getMe()
    expect(unset.locale).toBeNull()

    vi.mocked(apiClient.get).mockResolvedValueOnce({ ...mockProfile, locale: "en" })
    expect((await getMe()).locale).toBe("en")

    vi.mocked(apiClient.get).mockResolvedValueOnce({ ...mockProfile, locale: "es" })
    expect((await getMe()).locale).toBe("es")
  })
})
