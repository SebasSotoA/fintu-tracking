import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
  it("keeps accent pulse chrome and disables animation under reduced motion", () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('[data-slot="skeleton"]')
    expect(el).toHaveClass("bg-accent")
    expect(el).toHaveClass("animate-pulse")
    expect(el).toHaveClass("rounded-md")
    expect(el).toHaveClass("motion-reduce:animate-none")
  })
})
