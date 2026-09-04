import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { TablePageSkeleton } from "./table-page-skeleton"

describe("TablePageSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<TablePageSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<TablePageSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders six desktop h-14 rows", () => {
    const { container } = render(<TablePageSkeleton />)
    const rows = container.querySelectorAll('[data-testid="table-page-skeleton-row"]')
    expect(rows).toHaveLength(6)
    rows.forEach((row) => {
      expect(row).toHaveClass("h-14")
    })
  })

  it("renders four filter chips by default and three when filterCount is 3", () => {
    const { container: four } = render(<TablePageSkeleton />)
    expect(four.querySelectorAll('[data-testid="table-page-skeleton-filter"]')).toHaveLength(4)

    const { container: three } = render(<TablePageSkeleton filterCount={3} />)
    expect(three.querySelectorAll('[data-testid="table-page-skeleton-filter"]')).toHaveLength(3)
  })
})
