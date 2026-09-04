import { describe, expect, it } from "vitest"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "./skeleton-a11y"

describe("skeletonRootProps", () => {
  it("exposes a status live region on root tokens", () => {
    expect(skeletonRootProps(undefined, DEFAULT_SKELETON_LABEL)).toEqual({
      role: "status",
      "aria-label": DEFAULT_SKELETON_LABEL,
    })
    expect(skeletonRootProps(false, "Cargando")).toEqual({
      role: "status",
      "aria-label": "Cargando",
    })
  })

  it("returns no live region props when nested to avoid stacked announcements", () => {
    expect(skeletonRootProps(true, DEFAULT_SKELETON_LABEL)).toEqual({})
  })
})
