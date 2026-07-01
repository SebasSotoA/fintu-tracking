import { describe, it, expect } from "vitest"
import { ApiError as ClientApiError } from "./client"
import { ApiError as ServerApiError } from "./server-client"
import { isApiError, isSubscriptionRequiredError } from "./errors"

describe("isApiError", () => {
  it("returns true for client ApiError instances", () => {
    const error = new ClientApiError("Payment required", 402)

    expect(isApiError(error)).toBe(true)
  })

  it("returns true for server ApiError instances", () => {
    const error = new ServerApiError("Forbidden", 403)

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
    expect(isSubscriptionRequiredError(new ClientApiError("Payment required", 402))).toBe(true)
  })

  it("returns true for client 403 errors", () => {
    expect(isSubscriptionRequiredError(new ClientApiError("Forbidden", 403))).toBe(true)
  })

  it("returns true for server 402/403 errors", () => {
    expect(isSubscriptionRequiredError(new ServerApiError("Payment required", 402))).toBe(true)
    expect(isSubscriptionRequiredError(new ServerApiError("Forbidden", 403))).toBe(true)
  })

  it("returns false for other API errors", () => {
    expect(isSubscriptionRequiredError(new ClientApiError("Unauthorized", 401))).toBe(false)
    expect(isSubscriptionRequiredError(new ClientApiError("Not found", 404))).toBe(false)
  })
})
