import { describe, expect, it } from "vitest"
import { navActive, navIdle, sidebarLabelClass } from "./app-sidebar-constants"

describe("navIdle and navActive", () => {
  it("uses semantic foreground in light and does not use unprefixed hover:text-white", () => {
    expect(navIdle).toContain("hover:text-foreground")
    expect(navActive).toContain("text-foreground")
    expect(navIdle.replaceAll("dark:hover:text-white", "")).not.toContain("hover:text-white")
  })
})

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
