import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  DashboardPageSkeleton,
  NetWorthCardSkeleton,
} from "./dashboard-page-skeleton"

describe("DashboardPageSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<DashboardPageSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<DashboardPageSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("nests inner tokens without stacking live regions", () => {
    render(<DashboardPageSkeleton />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
  })

  it("matches the live primary grid rows template", () => {
    render(<DashboardPageSkeleton />)
    const grid = screen.getByTestId("dashboard-primary-grid")
    expect(grid).toHaveClass("lg:grid-rows-[1fr_auto_1fr]")
    expect(screen.getByTestId("dashboard-page-skeleton")).toBeInTheDocument()
  })

  it("includes a NetWorth chart placeholder with min-h-[128px] and period bars", () => {
    const { container } = render(<NetWorthCardSkeleton nested />)
    const chart = container.querySelector('[data-testid="net-worth-chart-skeleton"]')
    expect(chart).toHaveClass("min-h-[128px]")
    expect(container.querySelectorAll('[data-testid="net-worth-period-bar"]')).toHaveLength(5)
  })
})
