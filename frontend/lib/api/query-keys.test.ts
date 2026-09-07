import { describe, expect, it, vi } from "vitest"
import type { QueryClient } from "@tanstack/react-query"
import {
  invalidateAfterCashFlowMutation,
  invalidateAfterTradeMutation,
  queryKeys,
} from "./query-keys"

describe("queryKeys list prefixes", () => {
  it("exposes cash-flows, trades, and holdings prefixes", () => {
    expect(queryKeys.cashFlows()).toEqual(["cash-flows"])
    expect(queryKeys.trades()).toEqual(["trades"])
    expect(queryKeys.holdings()).toEqual(["holdings"])
  })
})

describe("invalidateAfterMutation", () => {
  it("invalidates cash-flows, trades, and holdings prefixes", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    await invalidateAfterCashFlowMutation(queryClient)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlows() })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.trades() })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.holdings() })
  })

  it("shares the same helper for trade mutations", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    await invalidateAfterTradeMutation(queryClient)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.cashFlows() })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.trades() })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.holdings() })
  })
})
