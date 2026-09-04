import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import ResetPasswordPage from "./page"

const mockReplace = vi.fn()
const mockGetSession = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

function renderPage() {
  return render(
    <EnglishLocaleWrapper>
      <ResetPasswordPage />
    </EnglishLocaleWrapper>,
  )
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetSession.mockReturnValue(new Promise(() => {}))
  })

  it("shows an auth card skeleton while checking the session", () => {
    renderPage()

    const status = screen.getByRole("status", { name: "Loading" })
    expect(status.querySelector("[data-slot='skeleton']")).not.toBeNull()
    expect(document.querySelector(".animate-spin")).toBeNull()
  })
})
