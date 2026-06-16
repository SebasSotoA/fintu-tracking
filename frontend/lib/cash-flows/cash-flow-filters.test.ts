import { describe, expect, it } from "vitest"
import {
  cashFlowFiltersToApiParams,
  cashFlowFiltersToSearchParams,
  hasActiveCashFlowFilters,
  parseCashFlowFiltersFromSearchParams,
} from "./cash-flow-filters"

describe("cash-flow-filters", () => {
  it("parses type and currency from search params", () => {
    const filters = parseCashFlowFiltersFromSearchParams({
      type: "deposit",
      currency: "usd",
      from: "2024-01-01",
      to: "2024-06-30",
    })
    expect(filters.type).toBe("deposit")
    expect(filters.currency).toBe("USD")
    expect(filters.dateRange.from).toBe("2024-01-01")
    expect(filters.dateRange.to).toBe("2024-06-30")
  })

  it("maps filters to API params", () => {
    const params = cashFlowFiltersToApiParams(
      parseCashFlowFiltersFromSearchParams({ type: "deposit", currency: "COP" }),
    )
    expect(params).toEqual({ type: "deposit", currency: "COP" })
  })

  it("accepts cash adjustment type from search params", () => {
    const filters = parseCashFlowFiltersFromSearchParams({ type: "cash_adjustment" })
    expect(filters.type).toBe("cash_adjustment")
    expect(cashFlowFiltersToApiParams(filters)).toEqual({ type: "cash_adjustment" })
  })

  it("serializes filters to URL params", () => {
    const params = cashFlowFiltersToSearchParams(
      parseCashFlowFiltersFromSearchParams({ type: "withdrawal" }),
    )
    expect(params.get("type")).toBe("withdrawal")
    expect(hasActiveCashFlowFilters(parseCashFlowFiltersFromSearchParams({ type: "withdrawal" }))).toBe(
      true,
    )
  })

  it("ignores unsupported fee filter value from URL", () => {
    const filters = parseCashFlowFiltersFromSearchParams({ type: "fee" })
    expect(filters.type).toBe("all")
    expect(cashFlowFiltersToApiParams(filters)).toEqual({})
  })
})
