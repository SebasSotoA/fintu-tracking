import { describe, expect, it } from "vitest"
import { protectedSkeletonKind } from "./protected-page-skeleton"

describe("protectedSkeletonKind", () => {
  it("maps dashboard paths to the dashboard skeleton", () => {
    expect(protectedSkeletonKind("/dashboard")).toBe("dashboard")
    expect(protectedSkeletonKind("/dashboard/extra")).toBe("dashboard")
  })

  it("maps performance paths to the performance skeleton", () => {
    expect(protectedSkeletonKind("/performance")).toBe("performance")
  })

  it("maps cash-flows paths to the cash-flows skeleton", () => {
    expect(protectedSkeletonKind("/cash-flows")).toBe("cash-flows")
  })

  it("maps trades, subscription, and unknown paths to the table skeleton", () => {
    expect(protectedSkeletonKind("/trades")).toBe("table")
    expect(protectedSkeletonKind("/subscription")).toBe("table")
    expect(protectedSkeletonKind("/")).toBe("table")
    expect(protectedSkeletonKind(null)).toBe("table")
  })
})
