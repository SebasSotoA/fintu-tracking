import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CHART_HEIGHT_MEDIUM, CHART_HEIGHT_SHORT } from "@/lib/chart-sizes"
import { ChartPanelSkeleton } from "./chart-panel-skeleton"

describe("ChartPanelSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<ChartPanelSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<ChartPanelSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("uses the short chart height class by default", () => {
    const { container } = render(<ChartPanelSkeleton />)
    const chart = container.querySelector('[data-testid="chart-panel-skeleton-plot"]')
    expect(chart?.className).toContain(CHART_HEIGHT_SHORT)
  })

  it("uses the medium chart height class when requested", () => {
    const { container } = render(<ChartPanelSkeleton height="medium" />)
    const chart = container.querySelector('[data-testid="chart-panel-skeleton-plot"]')
    expect(chart?.className).toContain(CHART_HEIGHT_MEDIUM)
  })

  it("renders a sparkline plot at h-[140px]", () => {
    const { container } = render(<ChartPanelSkeleton height="sparkline" />)
    const chart = container.querySelector('[data-testid="chart-panel-skeleton-plot"]')
    expect(chart).toHaveClass("h-[140px]")
  })
})
