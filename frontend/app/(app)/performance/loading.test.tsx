import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import PerformanceLoading from "./loading"

describe("PerformanceLoading", () => {
  it("renders PerformancePageSkeleton (insight strip + now|chart + fees|fx), not stacked slabs", () => {
    const { container } = render(<PerformanceLoading />)

    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument()
    expect(screen.getByTestId("chart-panel-skeleton-plot")).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(container.querySelector("svg.animate-spin")).toBeNull()

    const root = container.firstElementChild
    expect(root?.children).toHaveLength(3)
    expect(root?.children[0]).toHaveAttribute("data-testid", "kpi-strip-skeleton")
    expect(root?.children[1]?.className).toMatch(/lg:grid-cols-\[320px_1fr\]/)
    expect(root?.children[2]?.className).toMatch(/md:grid-cols-2/)
  })
})
