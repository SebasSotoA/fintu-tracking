import { describe, it, expect } from "vitest"
import { ApiError } from "./client"
import { isApiError, isSubscriptionRequiredError, isUnauthorizedError } from "./errors"

describe("isApiError", () => {
  it("returns true for client ApiError instances", () => {
    const error = new ApiError("Payment required", 402)

    expect(isApiError(error)).toBe(true)
  })

  it("returns false for generic errors", () => {
    expect(isApiError(new Error("boom"))).toBe(false)
    expect(isApiError("nope")).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})

describe("isSubscriptionRequiredError", () => {
  it("returns true for client 402 errors", () => {
    expect(isSubscriptionRequiredError(new ApiError("Payment required", 402))).toBe(true)
  })

  it("returns true for client 403 errors", () => {
    expect(isSubscriptionRequiredError(new ApiError("Forbidden", 403))).toBe(true)
  })

  it("returns false for other API errors", () => {
    expect(isSubscriptionRequiredError(new ApiError("Unauthorized", 401))).toBe(false)
    expect(isSubscriptionRequiredError(new ApiError("Not found", 404))).toBe(false)
  })
})

describe("isUnauthorizedError", () => {
  it("returns true for 401 errors", () => {
    expect(isUnauthorizedError(new ApiError("Unauthorized", 401))).toBe(true)
  })

  it("returns false for other API errors", () => {
    expect(isUnauthorizedError(new ApiError("Forbidden", 403))).toBe(false)
  })
})
