import { describe, expect, it } from "vitest"
import { en } from "./en"
import { es } from "./es"
import { t } from "./t"

describe("t", () => {
  it("resolves nested catalog keys", () => {
    expect(t(en, "nav.dashboard")).toBe("Dashboard")
    expect(t(es, "nav.dashboard")).toBe("Panel")
    expect(t(en, "settings.language")).toBe("Language")
    expect(t(es, "settings.language")).toBe("Idioma")
  })

  it("replaces {name} placeholders from the vars map", () => {
    expect(t(en, "hello", { name: "Ana" })).toBe("Hello, Ana")
    expect(t(es, "hello", { name: "Ana" })).toBe("Hola, Ana")
  })

  it("leaves unknown placeholders in the string", () => {
    expect(t(en, "hello")).toBe("Hello, {name}")
    expect(t(en, "hello", { other: "x" })).toBe("Hello, {name}")
  })
})
