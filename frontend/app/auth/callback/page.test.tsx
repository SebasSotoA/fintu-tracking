import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import AuthCallbackPage from "./page"

const mockReplace = vi.fn()
const mockExchangeCodeForSession = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams("code=abc123&next=/dashboard"),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}))

function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>
        <AuthCallbackPage />
      </QueryClientProvider>
    </EnglishLocaleWrapper>,
  )
}

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it("shows an auth card skeleton while exchanging the code", () => {
    mockExchangeCodeForSession.mockReturnValue(new Promise(() => {}))

    renderPage()

    const status = screen.getByRole("status", { name: "Loading" })
    expect(status.querySelector("[data-slot='skeleton']")).not.toBeNull()
    expect(document.querySelector(".animate-spin")).toBeNull()
  })

  it("exchanges code for session and redirects to next", async () => {
    renderPage()

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123")
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })
})
