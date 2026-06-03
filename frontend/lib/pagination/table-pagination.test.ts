import { describe, expect, it } from "vitest"
import {
  clampPage,
  parsePageParams,
  parsePageSize,
  totalPages,
} from "./table-pagination"

describe("totalPages", () => {
  it("returns 1 for empty totals", () => {
    expect(totalPages(0, 50)).toBe(1)
  })

  it("ceil-divides row count", () => {
    expect(totalPages(51, 50)).toBe(2)
  })
})

describe("clampPage", () => {
  it("clamps high page to last page", () => {
    expect(clampPage(9, 40, 50)).toBe(1)
    expect(clampPage(3, 120, 50)).toBe(3)
  })
})

describe("parsePageParams", () => {
  it("defaults page and page_size", () => {
    expect(parsePageParams({})).toEqual({ page: 1, pageSize: 50 })
  })

  it("parses valid page_size options", () => {
    expect(parsePageSize("25")).toBe(25)
    expect(parsePageSize("999")).toBe(50)
  })
})
