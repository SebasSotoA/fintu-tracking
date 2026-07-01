import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useUpdateProfile } from "./use-update-profile"
import { updateProfile } from "@/lib/api/me"

vi.mock("@/lib/api/me", () => ({
  updateProfile: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useUpdateProfile", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("calls updateProfile with country and broker_preset_id", async () => {
    vi.mocked(updateProfile).mockResolvedValueOnce({
      id: "p1",
      user_id: "u1",
      country: "mx",
      broker_preset_id: "hapi-colombia",
      onboarding_completed: true,
      onboarding_step: "done",
      created_at: "",
      updated_at: "",
    })

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() })

    result.current.mutate({ country: "mx", broker_preset_id: "hapi-colombia" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateProfile).toHaveBeenCalledWith({ country: "mx", broker_preset_id: "hapi-colombia" })
  })
})
