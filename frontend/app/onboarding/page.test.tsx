import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import OnboardingPage from "./page"

const mockReplace = vi.fn()
const mockGetUser = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <EnglishLocaleWrapper>
      <QueryClientProvider client={queryClient}>
        <OnboardingPage />
      </QueryClientProvider>
    </EnglishLocaleWrapper>,
  )
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
  })

  it("shows an app shell skeleton while redirecting", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}))

    renderPage()

    const status = screen.getByRole("status", { name: "Loading" })
    expect(status.querySelector("[data-slot='skeleton']")).not.toBeNull()
    expect(document.querySelector(".animate-spin")).toBeNull()
  })

  it("redirects unauthenticated users to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    renderPage()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/login")
    })
  })

  it("redirects authenticated users to dashboard", async () => {
    renderPage()

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    })
  })
})
