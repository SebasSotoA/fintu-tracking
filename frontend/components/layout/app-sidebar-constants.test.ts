import { describe, expect, it } from "vitest"
import { navActive, navIdle, sidebarLabelClass } from "./app-sidebar-constants"

function lightClasses(className: string): string {
  return className
    .split(/\s+/)
    .filter((cls) => cls.length > 0 && !cls.startsWith("dark:"))
    .join(" ")
}

describe("navIdle and navActive", () => {
  it("uses semantic foreground in light and does not use unprefixed hover:text-white", () => {
    expect(navIdle).toContain("hover:text-foreground")
    expect(navActive).toContain("text-foreground")
    expect(navIdle.replaceAll("dark:hover:text-white", "")).not.toContain("hover:text-white")
  })

  it("uses a primary-tinted inset ring for light pressed state instead of flat bg-muted", () => {
    expect(navActive).toContain("bg-primary/10")
    expect(navActive).toContain("ring-1")
    expect(navActive).toContain("ring-inset")
    expect(navActive).toContain("ring-primary/25")
    expect(navActive).toContain("text-foreground")
    expect(lightClasses(navActive)).not.toContain("bg-muted")
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
