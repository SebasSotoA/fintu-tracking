import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClient } from "@tanstack/react-query"

const mockUnsubscribe = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockPush = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/components/locale-provider", () => ({
  LocaleProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}))

import { Providers } from "./providers"

type AuthCallback = (
  event: string,
  session: { user: { id: string } } | null,
) => void

describe("Providers query cache user sync", () => {
  let authCallback: AuthCallback | undefined
  let clearSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetAllMocks()
    authCallback = undefined
    mockOnAuthStateChange.mockImplementation((callback: AuthCallback) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })
    clearSpy = vi.spyOn(QueryClient.prototype, "clear")
  })

  afterEach(() => {
    clearSpy.mockRestore()
  })

  it("does not clear the cache on the first INITIAL_SESSION", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )

    authCallback?.("INITIAL_SESSION", { user: { id: "user-a" } })

    expect(clearSpy).not.toHaveBeenCalled()
  })

  it("clears the cache on A → B without logout", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )

    authCallback?.("INITIAL_SESSION", { user: { id: "user-a" } })
    authCallback?.("SIGNED_IN", { user: { id: "user-b" } })

    expect(clearSpy).toHaveBeenCalledTimes(1)
  })

  it("clears the cache on A → null → B (logout then Google login)", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )

    authCallback?.("INITIAL_SESSION", { user: { id: "user-a" } })
    authCallback?.("SIGNED_OUT", null)
    authCallback?.("SIGNED_IN", { user: { id: "user-b" } })

    expect(clearSpy).toHaveBeenCalledTimes(2)
  })

  it("does not clear the cache on TOKEN_REFRESHED for the same user", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )

    authCallback?.("INITIAL_SESSION", { user: { id: "user-a" } })
    authCallback?.("TOKEN_REFRESHED", { user: { id: "user-a" } })

    expect(clearSpy).not.toHaveBeenCalled()
  })

  it("unsubscribes from auth changes on unmount", () => {
    const { unmount } = render(
      <Providers>
        <div>child</div>
      </Providers>,
    )

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
