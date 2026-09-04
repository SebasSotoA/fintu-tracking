import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { KpiStripSkeleton } from "./kpi-strip-skeleton"

describe("KpiStripSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<KpiStripSkeleton columns={3} />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<KpiStripSkeleton columns={3} nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("uses a 3-column grid with three tiles and no em-dash placeholders", () => {
    const { container } = render(<KpiStripSkeleton columns={3} />)
    const strip = screen.getByTestId("kpi-strip-skeleton")
    expect(strip).toHaveClass("sm:grid-cols-3")
    expect(strip).not.toHaveClass("sm:grid-cols-4")
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(3)
    expect(screen.queryByText("—")).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(9)
  })

  it("uses a 4-column grid with four tiles", () => {
    const { container } = render(<KpiStripSkeleton columns={4} />)
    const strip = screen.getByTestId("kpi-strip-skeleton")
    expect(strip).toHaveClass("sm:grid-cols-4")
    expect(strip).not.toHaveClass("sm:grid-cols-3")
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(4)
  })
})
