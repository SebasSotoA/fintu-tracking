import { describe, expect, it } from "vitest"
import {
  DEFAULT_CASH_FLOW_FILTERS,
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

  it("parses sort and dir from search params", () => {
    const filters = parseCashFlowFiltersFromSearchParams({
      sort: "amount",
      dir: "asc",
    })
    expect(filters.sort).toBe("amount")
    expect(filters.dir).toBe("asc")
  })

  it("defaults unknown sort and dir to date descending", () => {
    const filters = parseCashFlowFiltersFromSearchParams({
      sort: "not_a_column",
      dir: "sideways",
    })
    expect(filters.sort).toBe("date")
    expect(filters.dir).toBe("desc")
  })

  it("omits default sort and dir from URL and API params", () => {
    const filters = parseCashFlowFiltersFromSearchParams({})
    expect(filters).toEqual(DEFAULT_CASH_FLOW_FILTERS)
    expect(cashFlowFiltersToSearchParams(filters).toString()).toBe("")
    expect(cashFlowFiltersToApiParams(filters)).toEqual({})
  })

  it("serializes and maps non-default sort to URL and API params", () => {
    const filters = parseCashFlowFiltersFromSearchParams({
      sort: "fx_rate",
      dir: "asc",
    })
    const search = cashFlowFiltersToSearchParams(filters)
    expect(search.get("sort")).toBe("fx_rate")
    expect(search.get("dir")).toBe("asc")
    expect(cashFlowFiltersToApiParams(filters)).toEqual({ sort: "fx_rate", dir: "asc" })
  })

  it("does not treat sort as an active filter", () => {
    expect(hasActiveCashFlowFilters(DEFAULT_CASH_FLOW_FILTERS)).toBe(false)
    expect(
      hasActiveCashFlowFilters({
        ...DEFAULT_CASH_FLOW_FILTERS,
        sort: "amount",
        dir: "asc",
      }),
    ).toBe(false)
  })
})
