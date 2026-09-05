import { describe, expect, it } from "vitest"
import { nextQueryCacheUserId } from "./sync-query-cache-user"

describe("nextQueryCacheUserId", () => {
  it("does not clear on the first session observation", () => {
    expect(nextQueryCacheUserId(undefined, "user-a")).toEqual({
      lastUserId: "user-a",
      shouldClear: false,
    })
  })

  it("does not clear on the first observation when logged out", () => {
    expect(nextQueryCacheUserId(undefined, null)).toEqual({
      lastUserId: null,
      shouldClear: false,
    })
  })

  it("clears when user A signs out (A → null)", () => {
    expect(nextQueryCacheUserId("user-a", null)).toEqual({
      lastUserId: null,
      shouldClear: true,
    })
  })

  it("clears when a logged-out session becomes user B (null → B)", () => {
    expect(nextQueryCacheUserId(null, "user-b")).toEqual({
      lastUserId: "user-b",
      shouldClear: true,
    })
  })

  it("clears on A → B without logout", () => {
    expect(nextQueryCacheUserId("user-a", "user-b")).toEqual({
      lastUserId: "user-b",
      shouldClear: true,
    })
  })

  it("does not clear on the same user (TOKEN_REFRESHED)", () => {
    expect(nextQueryCacheUserId("user-a", "user-a")).toEqual({
      lastUserId: "user-a",
      shouldClear: false,
    })
  })
})
