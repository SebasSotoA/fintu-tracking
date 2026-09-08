import { describe, expect, it } from "vitest"
import { elevatedSurfaceClass } from "./elevated-glass"

describe("elevatedSurfaceClass", () => {
  it("returns glass tokens by default", () => {
    expect(elevatedSurfaceClass()).toContain("to-card/90")
    expect(elevatedSurfaceClass("glass")).toContain("backdrop-blur-[12px]")
  })

  it("returns an opaque page fill without glass", () => {
    const opaque = elevatedSurfaceClass("opaque")
    expect(opaque).toContain("relative")
    expect(opaque).toContain("bg-background")
    expect(opaque).toContain("text-foreground")
    expect(opaque).not.toContain("to-card/90")
    expect(opaque).not.toContain("backdrop-blur")
  })

  it("returns a background frost with a light glass blur", () => {
    const frost = elevatedSurfaceClass("frost")
    expect(frost).toContain("bg-background/88")
    expect(frost).toContain("backdrop-blur-[16px]")
    expect(frost).toContain("text-foreground")
    expect(frost).not.toContain("bg-gradient-to-b")
    expect(frost).not.toContain("from-white/[0.10]")
    expect(frost).not.toContain("to-card/90")
  })
})
