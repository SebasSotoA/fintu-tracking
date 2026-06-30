import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmptyStateActions, EmptyStateAction } from "./empty-state-actions"

describe("EmptyStateActions", () => {
  it("renders children", () => {
    render(
      <EmptyStateActions>
        <button type="button">Add trade</button>
      </EmptyStateActions>,
    )
    expect(screen.getByRole("button", { name: "Add trade" })).toBeInTheDocument()
  })

  it("applies responsive flex layout", () => {
    render(
      <EmptyStateActions>
        <button type="button">Add trade</button>
      </EmptyStateActions>,
    )
    const wrapper = screen.getByRole("button", { name: "Add trade" }).parentElement
    expect(wrapper).toHaveClass("flex", "flex-col", "gap-3", "w-full", "md:w-auto")
  })

  it("merges custom className", () => {
    render(
      <EmptyStateActions className="justify-center">
        <button type="button">Add trade</button>
      </EmptyStateActions>,
    )
    const wrapper = screen.getByRole("button", { name: "Add trade" }).parentElement
    expect(wrapper).toHaveClass("justify-center")
  })
})

describe("EmptyStateAction", () => {
  it("renders children", () => {
    render(
      <EmptyStateAction>
        <button type="button">Add cash flow</button>
      </EmptyStateAction>,
    )
    expect(screen.getByRole("button", { name: "Add cash flow" })).toBeInTheDocument()
  })

  it("applies responsive width", () => {
    render(
      <EmptyStateAction>
        <button type="button">Add cash flow</button>
      </EmptyStateAction>,
    )
    const wrapper = screen.getByRole("button", { name: "Add cash flow" }).parentElement
    expect(wrapper).toHaveClass("w-full", "md:w-auto")
  })

  it("merges custom className", () => {
    render(
      <EmptyStateAction className="text-left">
        <button type="button">Add cash flow</button>
      </EmptyStateAction>,
    )
    const wrapper = screen.getByRole("button", { name: "Add cash flow" }).parentElement
    expect(wrapper).toHaveClass("text-left")
  })
})
