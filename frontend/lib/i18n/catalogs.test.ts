import { describe, expect, it } from "vitest"
import { en } from "./en"
import { es } from "./es"

function collectKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return prefix ? [prefix] : []
  }

  return Object.keys(value).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key
    const child = (value as Record<string, unknown>)[key]
    if (typeof child === "string") {
      return [path]
    }
    return collectKeys(child, path)
  })
}

describe("i18n catalogs", () => {
  it("has the same keys in English and Spanish", () => {
    expect(collectKeys(es).sort()).toEqual(collectKeys(en).sort())
  })

  it("includes the seed keys used to prove the kernel", () => {
    const keys = collectKeys(en)
    expect(keys).toContain("nav.dashboard")
    expect(keys).toContain("settings.language")
    expect(keys).toContain("hello")
    expect(keys).toContain("table.view")
    expect(keys).toContain("table.pageOf")
  })

  it("uses Tipo for trade side in Spanish, not Lado", () => {
    expect(en.trades.side).toBe("Side")
    expect(es.trades.side).toBe("Tipo")
    expect(es.trades.filterBySide).toBe("Filtrar operaciones por tipo")
    expect(es.trades.all).toBe("Todos")
    expect(es.filters.allDates).toBe("Todas las fechas")
  })
})
