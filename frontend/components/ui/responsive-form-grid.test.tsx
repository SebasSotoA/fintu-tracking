import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ResponsiveFormGrid } from "./responsive-form-grid"

describe("ResponsiveFormGrid", () => {
  it("applies mobile-first grid classes", () => {
    render(
      <ResponsiveFormGrid data-testid="grid">
        <div>Field 1</div>
        <div>Field 2</div>
      </ResponsiveFormGrid>,
    )

    const grid = screen.getByTestId("grid")
    expect(grid).toHaveClass("grid-cols-1")
    expect(grid).toHaveClass("md:grid-cols-2")
    expect(grid).toHaveClass("gap-4")
    expect(grid).toHaveTextContent("Field 1")
    expect(grid).toHaveTextContent("Field 2")
  })
})
