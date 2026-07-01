import { describe, expect, it } from "vitest"
import { sidebarLabelClass } from "./app-sidebar-constants"

describe("sidebarLabelClass", () => {
  it("hides labels when collapsed", () => {
    expect(sidebarLabelClass(true)).toContain("max-w-0")
    expect(sidebarLabelClass(true)).toContain("opacity-0")
    expect(sidebarLabelClass(true)).toContain("ease-in-out")
  })

  it("shows labels when expanded", () => {
    expect(sidebarLabelClass(false)).toContain("opacity-100")
    expect(sidebarLabelClass(false)).not.toContain("max-w-0")
  })
})
