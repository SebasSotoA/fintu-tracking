import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthFormHeader } from "./auth-form-header"

describe("AuthFormHeader", () => {
  it("renders a centered split headline without a Fintu logo", () => {
    render(
      <AuthFormHeader title="Welcome back" description="Enter your email" size="split" />,
    )

    expect(screen.queryByRole("link", { name: "Fintu" })).not.toBeInTheDocument()
    const heading = screen.getByRole("heading", { level: 1, name: "Welcome back" })
    expect(heading).toHaveClass("!text-4xl", "text-foreground")
    expect(heading.parentElement).toHaveClass("items-center", "text-center")
    expect(screen.getByText("Enter your email")).toBeInTheDocument()
  })

  it("renders a compact headline size with a Fintu logo", () => {
    render(
      <AuthFormHeader title="Reset password" description="Enter your email address" size="compact" />,
    )

    expect(screen.getByRole("link", { name: "Fintu" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("heading", { level: 1, name: "Reset password" })).toHaveClass(
      "!text-2xl",
      "text-foreground",
    )
  })
})
