import { describe, it, expect, beforeEach } from "vitest"
import {
  productIntroSeenKey,
  productIntroPendingKey,
  productTourStepKey,
  hasSeenProductIntro,
  isProductIntroPending,
  markProductIntroPending,
  markProductIntroSeen,
  getProductTourStep,
  setProductTourStep,
  clearProductTourStep,
} from "./product-intro-storage"

describe("product-intro-storage", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it("keeps the existing seen and pending key names", () => {
    expect(productIntroSeenKey("user-1")).toBe("fintu:product-intro-seen:user-1")
    expect(productIntroPendingKey("user-1")).toBe("fintu:product-intro-pending:user-1")
  })

  it("uses a sessionStorage step key namespaced by user", () => {
    expect(productTourStepKey("user-1")).toBe("fintu:product-tour-step:user-1")
  })

  it("reads and writes the 1-based tour step in sessionStorage", () => {
    expect(getProductTourStep("user-1")).toBeNull()
    setProductTourStep("user-1", 3)
    expect(sessionStorage.getItem(productTourStepKey("user-1"))).toBe("3")
    expect(getProductTourStep("user-1")).toBe(3)
  })

  it("clears the tour step", () => {
    setProductTourStep("user-1", 2)
    clearProductTourStep("user-1")
    expect(getProductTourStep("user-1")).toBeNull()
    expect(sessionStorage.getItem(productTourStepKey("user-1"))).toBeNull()
  })

  it("markProductIntroSeen clears pending and the tour step", () => {
    markProductIntroPending("user-1")
    setProductTourStep("user-1", 2)
    markProductIntroSeen("user-1")

    expect(hasSeenProductIntro("user-1")).toBe(true)
    expect(isProductIntroPending("user-1")).toBe(false)
    expect(getProductTourStep("user-1")).toBeNull()
  })
})
