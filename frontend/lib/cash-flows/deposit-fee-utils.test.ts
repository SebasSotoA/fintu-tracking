import { describe, expect, it } from "vitest"
import { computeNetUsdAfterFee, findLinkedDepositFee } from "./deposit-fee-utils"
import type { CashFlow } from "@/lib/types"

describe("findLinkedDepositFee", () => {
  it("returns fee row linked to deposit id", () => {
    const flows = [
      { id: "d1", type: "deposit" } as CashFlow,
      { id: "f1", type: "fee", related_cash_flow_id: "d1" } as CashFlow,
    ]
    expect(findLinkedDepositFee(flows, "d1")?.id).toBe("f1")
  })
})

describe("computeNetUsdAfterFee", () => {
  it("subtracts fee from gross", () => {
    expect(computeNetUsdAfterFee("395.99", "1.99")).toBe("394.00")
  })

  it("returns null for empty or non-positive fee", () => {
    expect(computeNetUsdAfterFee("100", "")).toBeNull()
    expect(computeNetUsdAfterFee("100", "0")).toBeNull()
  })
})
