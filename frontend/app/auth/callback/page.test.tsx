import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
    <QueryClientProvider client={queryClient}>
      <AuthCallbackPage />
    </QueryClientProvider>,
  )
}

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it("exchanges code for session and redirects to next", async () => {
    renderPage()

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123")
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })
})
