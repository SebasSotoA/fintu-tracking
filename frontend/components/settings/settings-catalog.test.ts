import { describe, expect, it } from "vitest"
import { SETTINGS_CATALOG, filterSettingsCatalog } from "./settings-catalog"

function categoryIds(query: string): string[] {
  return filterSettingsCatalog(SETTINGS_CATALOG, query).map((c) => c.id)
}

function rowIds(query: string): string[] {
  return filterSettingsCatalog(SETTINGS_CATALOG, query).flatMap((c) =>
    c.sections.flatMap((s) => s.rows.map((r) => r.id)),
  )
}

describe("filterSettingsCatalog", () => {
  it("matches broker to Account and the Broker row, not Theme", () => {
    const result = filterSettingsCatalog(SETTINGS_CATALOG, "broker")

    expect(categoryIds("broker")).toEqual(["account"])
    expect(rowIds("broker")).toEqual(["broker"])
    expect(result.some((c) => c.sections.some((s) => s.rows.some((r) => r.id === "theme")))).toBe(
      false,
    )
  })

  it("matches theme to General and the Theme row", () => {
    expect(categoryIds("theme")).toEqual(["general"])
    expect(rowIds("theme")).toEqual(["theme"])
  })

  it("returns the full catalog for an empty query", () => {
    expect(filterSettingsCatalog(SETTINGS_CATALOG, "")).toEqual(SETTINGS_CATALOG)
    expect(filterSettingsCatalog(SETTINGS_CATALOG, "   ")).toEqual(SETTINGS_CATALOG)
  })

  it("returns an empty catalog when nothing matches", () => {
    expect(filterSettingsCatalog(SETTINGS_CATALOG, "nope")).toEqual([])
  })

  it("matches appearance to the General APPEARANCE section", () => {
    const result = filterSettingsCatalog(SETTINGS_CATALOG, "appearance")

    expect(categoryIds("appearance")).toEqual(["general"])
    expect(result[0]?.sections.map((s) => s.heading)).toEqual(["APPEARANCE"])
    expect(rowIds("appearance")).toContain("theme")
  })

  it("omits General when the query only matches Account rows", () => {
    const result = filterSettingsCatalog(SETTINGS_CATALOG, "broker")
    expect(result.find((c) => c.id === "general")).toBeUndefined()
    expect(result[0]?.id).toBe("account")
  })

  it("includes a language row in Appearance", () => {
    const appearance = SETTINGS_CATALOG.find((c) => c.id === "general")?.sections.find(
      (s) => s.id === "appearance",
    )

    expect(appearance?.rows.map((r) => r.id)).toEqual(["theme", "language"])
    expect(appearance?.rows.find((r) => r.id === "language")?.label).toBe("Language")
  })

  it("matches idioma to the language row", () => {
    expect(categoryIds("idioma")).toEqual(["general"])
    expect(rowIds("idioma")).toEqual(["language"])
  })

  it("matches tema to the Theme row", () => {
    expect(categoryIds("tema")).toEqual(["general"])
    expect(rowIds("tema")).toEqual(["theme"])
  })

  it("matches país to the Country row", () => {
    expect(categoryIds("país")).toEqual(["account"])
    expect(rowIds("país")).toEqual(["country"])
  })
})
