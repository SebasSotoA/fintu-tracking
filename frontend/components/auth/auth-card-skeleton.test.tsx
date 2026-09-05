import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthCardSkeleton } from "./auth-card-skeleton"

describe("AuthCardSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<AuthCardSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<AuthCardSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders paper chrome without the dashboard glass card", () => {
    const { container } = render(<AuthCardSkeleton />)
    const paper = container.querySelector(".auth-light")
    expect(paper).toBeInTheDocument()
    expect(paper?.className).toContain("rounded-2xl")
    expect(paper?.className).toContain("max-w-md")
    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument()
    expect(container.querySelector(".h-8.w-24")).toBeTruthy()
  })
})
