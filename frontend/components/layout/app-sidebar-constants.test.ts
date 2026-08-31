import { describe, expect, it } from "vitest"
import { navActive, navIdle, navLogoBlendClass, sidebarLabelClass } from "./app-sidebar-constants"

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

describe("navLogoBlendClass", () => {
  it("knocks out the black square and fills the glyph black in light mode", () => {
    expect(navLogoBlendClass).toContain("invert")
    expect(navLogoBlendClass).toContain("grayscale")
    expect(navLogoBlendClass).toContain("contrast-[1000%]")
    expect(navLogoBlendClass).toContain("mix-blend-multiply")
  })

  it("resets filters and uses mix-blend-screen in dark mode", () => {
    expect(navLogoBlendClass).toContain("dark:mix-blend-screen")
    expect(navLogoBlendClass).toContain("dark:invert-0")
    expect(navLogoBlendClass).toContain("dark:grayscale-0")
    expect(navLogoBlendClass).toContain("dark:contrast-100")
  })

  it("does not use mix-blend-screen as the light blend", () => {
    expect(lightClasses(navLogoBlendClass)).not.toContain("mix-blend-screen")
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
