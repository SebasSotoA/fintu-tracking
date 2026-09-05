import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthFormHeader } from "./auth-form-header"

describe("AuthFormHeader", () => {
  it("renders a left-aligned logo and split headline", () => {
    render(
      <AuthFormHeader title="Welcome back" description="Enter your email" size="split" />,
    )

    expect(screen.getByRole("link", { name: "Fintu" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toHaveClass("!text-4xl")
    expect(screen.getByText("Enter your email")).toBeInTheDocument()
  })

  it("renders a compact headline size", () => {
    render(
      <AuthFormHeader title="Reset password" description="Enter your email address" size="compact" />,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Reset password" })).toHaveClass("!text-2xl")
  })
})
