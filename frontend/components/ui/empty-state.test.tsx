import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmptyState } from "./empty-state"

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByText("No items")).toBeInTheDocument()
  })

  it("renders the description when provided", () => {
    render(<EmptyState title="No items" description="Add one to get started" />)
    expect(screen.getByText("Add one to get started")).toBeInTheDocument()
  })

  it("renders the action when provided", () => {
    render(<EmptyState title="No items" action={<button type="button">Create</button>} />)
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
  })

  it("wraps action full-width on mobile", () => {
    render(<EmptyState title="No items" action={<button type="button">Create</button>} />)
    const wrapper = screen.getByRole("button", { name: "Create" }).parentElement
    expect(wrapper).toHaveClass("w-full")
    expect(wrapper).toHaveClass("md:w-auto")
  })
})
