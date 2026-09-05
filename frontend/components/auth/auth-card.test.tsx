import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthCard } from "./auth-card"

describe("AuthCard", () => {
  it("renders compact paper chrome without the dashboard glass card", () => {
    const { container } = render(
      <AuthCard title="Reset password" description="Enter your email">
        <button type="button">Send</button>
      </AuthCard>,
    )

    expect(screen.getByRole("heading", { name: "Reset password" })).toHaveClass("!text-2xl")
    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument()
    expect(container.querySelector(".auth-light")?.className).toContain("max-w-md")
  })
})
