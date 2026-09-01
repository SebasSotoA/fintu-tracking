import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/cookie"
import { EnglishLocaleWrapper, renderWithLocale } from "@/lib/i18n/test-utils"
import { LocaleProvider, useLocale } from "./locale-provider"

function LocaleProbe() {
  const { locale, setLocale, t } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="dashboard">{t("nav.dashboard")}</span>
      <span data-testid="hello">{t("hello", { name: "Ana" })}</span>
      <button type="button" onClick={() => setLocale("es")}>
        switch-es
      </button>
    </div>
  )
}

describe("LocaleProvider", () => {
  afterEach(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`
    document.documentElement.lang = "en"
  })

  it("defaults to English via the test wrapper", () => {
    renderWithLocale(<LocaleProbe />)

    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(screen.getByTestId("dashboard")).toHaveTextContent("Dashboard")
    expect(screen.getByTestId("hello")).toHaveTextContent("Hello, Ana")
    expect(document.documentElement.lang).toBe("en")
  })

  it("keeps English when the cookie is Spanish", () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=es; path=/`

    render(
      <EnglishLocaleWrapper>
        <LocaleProbe />
      </EnglishLocaleWrapper>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(screen.getByTestId("dashboard")).toHaveTextContent("Dashboard")
    expect(document.documentElement.lang).toBe("en")
  })

  it("switches to Spanish, updates html lang, and writes the cookie", async () => {
    const user = userEvent.setup()
    renderWithLocale(<LocaleProbe />)

    await user.click(screen.getByRole("button", { name: "switch-es" }))

    expect(screen.getByTestId("locale")).toHaveTextContent("es")
    expect(screen.getByTestId("dashboard")).toHaveTextContent("Panel")
    expect(document.documentElement.lang).toBe("es")
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=es`)
  })

  it("detects locale from the cookie when defaultLocale is omitted", () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=es; path=/`

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("es")
    expect(document.documentElement.lang).toBe("es")
  })
})
