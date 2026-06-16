import { describe, expect, it } from "vitest"
import {
  computeCopFromNetUsd,
  computeHapiDepositBreakdown,
} from "./hapi-deposit-calculator"

describe("computeHapiDepositBreakdown", () => {
  it("computes subtotal and cop to wire from net usd, fee and fx", () => {
    expect(
      computeHapiDepositBreakdown({
        netUsd: "100",
        feeUsd: "1.99",
        fxRate: "3532.531",
      }),
    ).toEqual({
      netUsd: "100.00",
      subtotalUsd: "101.99",
      feeUsd: "1.99",
      copToWire: "360282.84",
    })
  })

  it("returns zeroed values when net usd or fx are invalid", () => {
    expect(
      computeHapiDepositBreakdown({
        netUsd: "",
        feeUsd: "1.99",
        fxRate: "3532.531",
      }),
    ).toEqual({
      netUsd: "0.00",
      subtotalUsd: "0.00",
      feeUsd: "1.99",
      copToWire: "0.00",
    })
  })
})

describe("computeCopFromNetUsd", () => {
  it("computes cop to wire from net usd, fee and fx", () => {
    expect(
      computeCopFromNetUsd({
        netUsd: "100",
        feeUsd: "1.99",
        fxRate: "3532.531",
      }),
    ).toBe("360282.84")
  })

  it("returns zero when net usd or fx are invalid", () => {
    expect(
      computeCopFromNetUsd({
        netUsd: "",
        feeUsd: "1.99",
        fxRate: "3532.531",
      }),
    ).toBe("0.00")
  })
})
