import { describe, expect, it } from "vitest"
import {
  computeCopToWireFromNetTarget,
  computeHapiDepositBreakdown,
} from "./hapi-deposit-calculator"

describe("computeHapiDepositBreakdown", () => {
  it("computes gross and net from cop, fx and fee", () => {
    expect(
      computeHapiDepositBreakdown({
        copAmount: "362390",
        fxRate: "3553.191",
        feeUsd: "1.99",
      }),
    ).toEqual({
      grossUsd: "101.99",
      feeUsd: "1.99",
      netUsdCredited: "100.00",
    })
  })

  it("returns zeroed values when cop or fx are invalid", () => {
    expect(
      computeHapiDepositBreakdown({
        copAmount: "",
        fxRate: "3553.191",
        feeUsd: "1.99",
      }),
    ).toEqual({
      grossUsd: "0.00",
      feeUsd: "1.99",
      netUsdCredited: "0.00",
    })
  })
})

describe("computeCopToWireFromNetTarget", () => {
  it("computes cop to wire from net target, fee and fx", () => {
    expect(
      computeCopToWireFromNetTarget({
        netUsdTarget: "100",
        feeUsd: "1.99",
        fxRate: "3553.191",
      }),
    ).toBe("362390")
  })

  it("returns zero when net target or fx are invalid", () => {
    expect(
      computeCopToWireFromNetTarget({
        netUsdTarget: "",
        feeUsd: "1.99",
        fxRate: "3553.191",
      }),
    ).toBe("0")
  })
})
