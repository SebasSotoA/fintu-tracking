import { describe, expect, it } from "vitest"
import {
  computeTicks,
  formatTooltipDate,
  formatAxisDateKey,
} from "./fx-rate-sparkline"

function chartPoint(dateKey: string): { dateKey: string; label: string; rate: number } {
  return { dateKey, label: dateKey, rate: 4000 }
}

describe("computeTicks", () => {
  it("returns every dateKey when data length is at most maxTicks", () => {
    const data = ["2026-01-01", "2026-01-02", "2026-01-03"].map((d) => chartPoint(d))
    expect(computeTicks(data, 6)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"])
  })

  it("returns evenly spaced ticks and always includes the last point", () => {
    const data = Array.from({ length: 30 }, (_, i) =>
      chartPoint(`2026-01-${String(i + 1).padStart(2, "0")}`),
    )
    const ticks = computeTicks(data, 6)
    expect(ticks).toHaveLength(6)
    expect(ticks[ticks.length - 1]).toBe("2026-01-30")
    expect(new Set(ticks).size).toBe(6)
  })
})

describe("formatAxisDateKey", () => {
  it("formats dates in en-US short month style", () => {
    expect(formatAxisDateKey("2026-04-26")).toBe("Apr 26")
  })
})

describe("formatTooltipDate", () => {
  it("formats recent dates in en-US with weekday", () => {
    const recent = new Date()
    recent.setDate(recent.getDate() - 2)
    const dateKey = recent.toISOString().slice(0, 10)
    const formatted = formatTooltipDate(dateKey)
    expect(formatted).not.toMatch(/[áéíóúñ]/i)
    expect(formatted.length).toBeGreaterThan(0)
  })

  it("formats older dates in en-US without Spanish month abbreviations", () => {
    expect(formatTooltipDate("2025-01-15")).toMatch(/jan/)
    expect(formatTooltipDate("2025-01-15")).not.toMatch(/ene/)
  })
})
