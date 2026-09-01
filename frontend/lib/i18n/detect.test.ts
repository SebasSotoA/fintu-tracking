import { afterEach, describe, expect, it } from "vitest"
import { detectLocale } from "./detect"

describe("detectLocale", () => {
  afterEach(() => {
    document.cookie = "fintu-locale=; path=/; max-age=0"
  })

  it("uses the fintu-locale cookie when it is en or es", () => {
    expect(detectLocale({ cookie: "fintu-locale=es", language: "en-US" })).toBe("es")
    expect(detectLocale({ cookie: "theme=dark; fintu-locale=en", language: "es-CO" })).toBe("en")
  })

  it("ignores invalid cookie values and falls through to navigator.language", () => {
    expect(detectLocale({ cookie: "fintu-locale=fr", language: "es-MX" })).toBe("es")
    expect(detectLocale({ cookie: "fintu-locale=EN", language: "en-US" })).toBe("en")
  })

  it("maps navigator.language starting with es (case-insensitive) to es", () => {
    expect(detectLocale({ cookie: "", language: "es" })).toBe("es")
    expect(detectLocale({ cookie: "", language: "es-CO" })).toBe("es")
    expect(detectLocale({ cookie: "", language: "ES-mx" })).toBe("es")
  })

  it("defaults to en when navigator.language is not Spanish", () => {
    expect(detectLocale({ cookie: "", language: "en-US" })).toBe("en")
    expect(detectLocale({ cookie: "", language: "pt-BR" })).toBe("en")
    expect(detectLocale({ cookie: "", language: "" })).toBe("en")
  })

  it("reads document.cookie and navigator.language when no input is given", () => {
    document.cookie = "fintu-locale=es; path=/"
    expect(detectLocale()).toBe("es")
  })
})
