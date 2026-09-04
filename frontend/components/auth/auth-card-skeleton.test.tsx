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

  it("renders logo, two input bars, and a button bar", () => {
    const { container } = render(<AuthCardSkeleton />)
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelector(".h-8.w-24")).toBeTruthy()
    expect(container.querySelectorAll(".h-11").length).toBeGreaterThanOrEqual(3)
  })
})
