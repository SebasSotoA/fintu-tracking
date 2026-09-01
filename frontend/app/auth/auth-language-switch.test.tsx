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
})
