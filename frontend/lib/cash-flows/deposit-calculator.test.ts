import { describe, expect, it } from "vitest"
import {
  computeCopFromNetUsd,
  computeDepositBreakdown,
  feeInputToUsd,
} from "./deposit-calculator"

describe("computeDepositBreakdown", () => {
  it("computes subtotal and local amount from net usd, fee and fx", () => {
    expect(
      computeDepositBreakdown({
        netUsd: "100",
        feeUsd: "1.99",
        fxRate: "3532.531",
      }),
    ).toEqual({
      netUsd: "100.00",
      subtotalUsd: "101.99",
      feeUsd: "1.99",
      localAmount: "360282.84",
    })
  })

  it("returns zeroed values when net usd or fx are invalid", () => {
    expect(
      computeDepositBreakdown({
        netUsd: "",
        feeUsd: "1.99",
        fxRate: "3532.531",
      }),
    ).toEqual({
      netUsd: "0.00",
      subtotalUsd: "0.00",
      feeUsd: "1.99",
      localAmount: "0.00",
    })
  })
})

describe("computeCopFromNetUsd", () => {
  it("computes local amount to wire from net usd, fee and fx", () => {
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

describe("feeInputToUsd", () => {
  it("returns the typed USD fee for usd unit", () => {
    expect(feeInputToUsd("100", "1.99", "usd")).toBe("1.99")
  })

  it("converts percent of net usd to a two-decimal USD fee", () => {
    expect(feeInputToUsd("100", "0.9", "percent")).toBe("0.90")
  })

  it("treats empty fee as zero", () => {
    expect(feeInputToUsd("100", "", "usd")).toBe("0.00")
    expect(feeInputToUsd("100", "", "percent")).toBe("0.00")
  })

  it("returns zero percent fee when net usd is missing", () => {
    expect(feeInputToUsd("", "0.9", "percent")).toBe("0.00")
  })
})
