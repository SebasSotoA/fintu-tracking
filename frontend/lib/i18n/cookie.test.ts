import { afterEach, describe, expect, it } from "vitest"
import { LOCALE_COOKIE_NAME, readLocaleCookie, writeLocaleCookie } from "./cookie"

describe("locale cookie", () => {
  afterEach(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`
  })

  it("reads en or es from a cookie header and ignores other values", () => {
    expect(readLocaleCookie("fintu-locale=es; theme=dark")).toBe("es")
    expect(readLocaleCookie("fintu-locale=en")).toBe("en")
    expect(readLocaleCookie("fintu-locale=fr")).toBeNull()
    expect(readLocaleCookie("")).toBeNull()
  })

  it("writes fintu-locale immediately", () => {
    writeLocaleCookie("es")
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=es`)
    expect(readLocaleCookie()).toBe("es")
  })
})
