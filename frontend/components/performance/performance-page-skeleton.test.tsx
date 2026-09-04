import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CHART_HEIGHT_SHORT } from "@/lib/chart-sizes"
import { PerformancePageSkeleton } from "./performance-page-skeleton"

describe("PerformancePageSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<PerformancePageSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<PerformancePageSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("nests KPI and chart tokens without stacking live regions", () => {
    render(<PerformancePageSkeleton />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByTestId("kpi-strip-skeleton")).toHaveClass("sm:grid-cols-4")
    expect(screen.getByTestId("chart-panel-skeleton-plot").className).toContain(CHART_HEIGHT_SHORT)
  })
})
