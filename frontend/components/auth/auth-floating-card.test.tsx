import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthFloatingCard } from "./auth-floating-card"

describe("AuthFloatingCard", () => {
  it("renders split paper chrome at max-w-4xl with auth-light", () => {
    const { container } = render(
      <AuthFloatingCard variant="split" panel={<aside>value-panel</aside>}>
        form-column
      </AuthFloatingCard>,
    )

    const card = container.querySelector(".auth-light")
    expect(card).toBeInTheDocument()
    expect(card?.className).toContain("max-w-4xl")
    expect(card?.className).toContain("rounded-2xl")
    expect(card?.className).toContain("bg-white")
    expect(card?.className).toContain("text-foreground")
    expect(card?.className).not.toContain("max-w-md")
    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument()
    expect(screen.getByText("form-column")).toBeInTheDocument()
    expect(screen.getByText("value-panel")).toBeInTheDocument()
  })

  it("renders compact paper chrome at max-w-md with auth-light", () => {
    const { container } = render(
      <AuthFloatingCard variant="compact">compact-form</AuthFloatingCard>,
    )

    const card = container.querySelector(".auth-light")
    expect(card).toBeInTheDocument()
    expect(card?.className).toContain("max-w-md")
    expect(card?.className).toContain("rounded-2xl")
    expect(card?.className).toContain("text-foreground")
    expect(card?.className).not.toContain("max-w-4xl")
    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument()
    expect(screen.getByText("compact-form")).toBeInTheDocument()
  })
})
