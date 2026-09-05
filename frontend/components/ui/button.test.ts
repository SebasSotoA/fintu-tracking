import { describe, expect, it } from "vitest"
import { buttonVariants } from "./button"

describe("buttonVariants", () => {
  it("uses a spring-green primary glow on the default variant", () => {
    const classes = buttonVariants({ variant: "default" })

    expect(classes).toContain("shadow-[0_3px_12px_rgba(5,220,128,0.18)]")
    expect(classes).not.toContain("rgba(99,102,241,0.18)")
  })

  it("hovers with the semantic --primary-hover token, not the Tailwind --color-primary-hover alias", () => {
    const classes = buttonVariants({ variant: "default" })

    expect(classes).toContain("var(--primary-hover)")
    expect(classes).not.toContain("var(--color-primary-hover)")
    expect(classes).toContain("hover:text-primary-foreground")
  })
})
