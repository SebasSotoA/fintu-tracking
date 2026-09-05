import { createElement, type ReactNode } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
  let queryClient: QueryClient
  let clearSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetAllMocks()
    mockSignOut.mockResolvedValue(undefined)
    queryClient = new QueryClient()
    clearSpy = vi.spyOn(queryClient, "clear")
  })

  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  it("signs out and redirects to login", async () => {
    const { result } = renderHook(() => useSignOut(), { wrapper })

    await act(async () => {
      await result.current()
    })

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/auth/login")
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("clears the query cache before signOut and redirect", async () => {
    const { result } = renderHook(() => useSignOut(), { wrapper })

    await act(async () => {
      await result.current()
    })

    expect(clearSpy).toHaveBeenCalled()
    expect(clearSpy.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    )
    expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0],
    )
  })
})
