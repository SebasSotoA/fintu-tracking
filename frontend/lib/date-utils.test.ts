import { describe, expect, it } from "vitest"
import {
  formatCalendarDate,
  formatDateTime,
  formatShortMonthDay,
  formatShortMonthDayYear,
  formatShortMonthYear,
  formatShortMonthYear2Digit,
  formatTooltipDate,
  intlLocale,
  listMonthNames,
  toDateInputValue,
} from "./date-utils"

describe("toDateInputValue", () => {
  it("extracts YYYY-MM-DD from RFC3339", () => {
    expect(toDateInputValue("2026-06-01T00:00:00Z")).toBe("2026-06-01")
  })

  it("passes through date-only strings", () => {
    expect(toDateInputValue("2026-06-01")).toBe("2026-06-01")
  })
})

describe("intlLocale", () => {
  it("maps en to en-US and es to es-CO", () => {
    expect(intlLocale("en")).toBe("en-US")
    expect(intlLocale("es")).toBe("es-CO")
  })
})

describe("formatCalendarDate", () => {
  it("does not shift June 1 to previous month/day in US locale", () => {
    const formatted = formatCalendarDate("2026-06-01T00:00:00Z", "en-US")
    expect(formatted).toBe("6/1/2026")
  })

  it("defaults to en-US month-first order when locale is omitted", () => {
    expect(formatCalendarDate("2026-06-01")).toBe("6/1/2026")
  })

  it("uses day-first order for es-CO instead of US month-first", () => {
    const en = formatCalendarDate("2026-06-01", "en-US")
    const es = formatCalendarDate("2026-06-01", "es-CO")
    expect(en).toBe("6/1/2026")
    expect(es).not.toBe(en)
    expect(es).toMatch(/2026/)
    expect(es.indexOf("1")).toBeLessThan(es.indexOf("6"))
  })
})

describe("formatTooltipDate", () => {
  it("formats older dates in en-US with English month abbreviations", () => {
    const formatted = formatTooltipDate("2025-01-15")
    expect(formatted).toMatch(/jan/)
    expect(formatted).not.toMatch(/ene/)
  })

  it("formats older dates in es-CO with Spanish month abbreviations", () => {
    const formatted = formatTooltipDate("2025-01-15", "es-CO")
    expect(formatted).toMatch(/ene/)
    expect(formatted).not.toMatch(/jan/)
  })
})

describe("listMonthNames", () => {
  it("returns English long month names for en-US", () => {
    const names = listMonthNames("en-US", "long")
    expect(names[0]).toBe("January")
    expect(names[5]).toBe("June")
  })

  it("returns Spanish long month names for es-CO", () => {
    const names = listMonthNames("es-CO", "long")
    expect(names[0].toLowerCase()).toBe("enero")
    expect(names[5].toLowerCase()).toBe("junio")
    expect(names).not.toContain("January")
  })
})

describe("formatShortMonthDay", () => {
  it("uses English month abbreviations for en-US", () => {
    expect(formatShortMonthDay("2026-04-26", "en-US")).toBe("Apr 26")
  })

  it("uses Spanish month abbreviations for es-CO", () => {
    const formatted = formatShortMonthDay("2026-04-26", "es-CO")
    expect(formatted.toLowerCase()).toMatch(/abr/)
    expect(formatted.toLowerCase()).not.toMatch(/apr/)
  })
})

describe("formatShortMonthDayYear", () => {
  it("keeps English month abbreviations for en-US", () => {
    const formatted = formatShortMonthDayYear("2026-01-15", "en-US")
    expect(formatted.toLowerCase()).toMatch(/jan/)
    expect(formatted).toMatch(/2026/)
    expect(formatted.toLowerCase()).not.toMatch(/ene/)
  })

  it("uses Spanish month abbreviations for es-CO", () => {
    const formatted = formatShortMonthDayYear("2026-01-15", "es-CO")
    expect(formatted.toLowerCase()).toMatch(/ene/)
    expect(formatted).toMatch(/2026/)
    expect(formatted.toLowerCase()).not.toMatch(/jan/)
  })
})

describe("formatShortMonthYear", () => {
  it("formats chart ticks in en-US", () => {
    const formatted = formatShortMonthYear("2025-01-01", "en-US")
    expect(formatted.toLowerCase()).toMatch(/jan/)
    expect(formatted).toMatch(/2025/)
  })

  it("formats chart ticks in es-CO without English abbreviations", () => {
    const formatted = formatShortMonthYear("2025-01-01", "es-CO")
    expect(formatted.toLowerCase()).toMatch(/ene/)
    expect(formatted.toLowerCase()).not.toMatch(/jan/)
  })
})

describe("formatShortMonthYear2Digit", () => {
  it("formats fee-chart months in en-US", () => {
    const formatted = formatShortMonthYear2Digit("2024-01", "en-US")
    expect(formatted.toLowerCase()).toMatch(/jan/)
    expect(formatted).toMatch(/24/)
  })

  it("formats fee-chart months in es-CO", () => {
    const formatted = formatShortMonthYear2Digit("2024-01", "es-CO")
    expect(formatted.toLowerCase()).toMatch(/ene/)
    expect(formatted.toLowerCase()).not.toMatch(/jan/)
  })
})

describe("formatDateTime", () => {
  it("returns null for empty values", () => {
    expect(formatDateTime(null, "en-US")).toBeNull()
    expect(formatDateTime("", "en-US")).toBeNull()
  })

  it("uses English month abbreviations for en-US", () => {
    const formatted = formatDateTime("2026-01-15T10:05:00Z", "en-US")
    expect(formatted).toBeTruthy()
    expect(formatted!.toLowerCase()).toMatch(/jan/)
    expect(formatted!.toLowerCase()).not.toMatch(/ene/)
  })

  it("uses Spanish month abbreviations for es-CO", () => {
    const formatted = formatDateTime("2026-01-15T10:05:00Z", "es-CO")
    expect(formatted).toBeTruthy()
    expect(formatted!.toLowerCase()).toMatch(/ene/)
    expect(formatted!.toLowerCase()).not.toMatch(/jan/)
  })
})
