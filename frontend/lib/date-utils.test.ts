import { describe, expect, it } from "vitest"
import { formatCalendarDate, toDateInputValue } from "./date-utils"

describe("toDateInputValue", () => {
  it("extracts YYYY-MM-DD from RFC3339", () => {
    expect(toDateInputValue("2026-06-01T00:00:00Z")).toBe("2026-06-01")
  })

  it("passes through date-only strings", () => {
    expect(toDateInputValue("2026-06-01")).toBe("2026-06-01")
  })
})

describe("formatCalendarDate", () => {
  it("does not shift June 1 to previous month/day in US locale", () => {
    const formatted = formatCalendarDate("2026-06-01T00:00:00Z", "en-US")
    expect(formatted).toBe("6/1/2026")
  })
})
