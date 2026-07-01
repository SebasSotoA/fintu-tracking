import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSignOut } from "./use-sign-out"

const mockSignOut = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

describe("useSignOut", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSignOut.mockResolvedValue(undefined)
  })

  it("signs out and redirects to login", async () => {
    const { result } = renderHook(() => useSignOut())

    await act(async () => {
      await result.current()
    })

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/auth/login")
    expect(mockRefresh).toHaveBeenCalled()
  })
})
