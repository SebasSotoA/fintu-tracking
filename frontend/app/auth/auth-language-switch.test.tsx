import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { apiClient } from "@/lib/api/client"
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/cookie"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { AuthLanguageSwitch } from "./auth-language-switch"

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe("AuthLanguageSwitch", () => {
  afterEach(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`
    document.documentElement.lang = "en"
    vi.clearAllMocks()
  })

  it("renders English and Español and writes the cookie without calling the API", async () => {
    const user = userEvent.setup()
    renderWithLocale(<AuthLanguageSwitch />)

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "false")

    await user.click(screen.getByRole("button", { name: "Español" }))

    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false")
    expect(document.documentElement.lang).toBe("es")
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=es`)
    expect(apiClient.patch).not.toHaveBeenCalled()
    expect(apiClient.get).not.toHaveBeenCalled()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it("uses light text on navy instead of theme foreground tokens", () => {
    renderWithLocale(<AuthLanguageSwitch />)

    const english = screen.getByRole("button", { name: "English" })
    const spanish = screen.getByRole("button", { name: "Español" })
    const divider = screen.getByText("|")

    expect(english).toHaveClass("text-white")
    expect(english).toHaveClass("font-medium")
    expect(spanish).toHaveClass("text-white/60")
    expect(english.className).toContain("hover:bg-white/10")
    expect(english.className).toContain("focus-visible:ring-white/70")
    expect(divider).toHaveClass("text-white/40")
    expect(english.className).not.toContain("text-foreground")
    expect(spanish.className).not.toContain("text-muted-foreground")
  })
})
