import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  ActivityFeedCardSkeleton,
  HoldingsTableCardSkeleton,
  NetWorthCardSkeleton,
} from "./dashboard-card-skeleton"

describe("DashboardCardSkeleton re-exports", () => {
  it("NetWorthCardSkeleton includes a min-h-[128px] chart placeholder", () => {
    const { container } = render(<NetWorthCardSkeleton nested />)
    const chart = container.querySelector('[data-testid="net-worth-chart-skeleton"]')
    expect(chart).toHaveClass("min-h-[128px]")
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
  })

  it("ActivityFeedCardSkeleton renders six activity rows", () => {
    const { container } = render(<ActivityFeedCardSkeleton nested />)
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-testid="activity-feed-skeleton-row"]')).toHaveLength(6)
  })

  it("HoldingsTableCardSkeleton renders six h-14 rows as a section, not a card", () => {
    const { container } = render(<HoldingsTableCardSkeleton nested />)
    expect(container.querySelector("section")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument()
    const rows = container.querySelectorAll('[data-testid="holdings-section-skeleton-row"]')
    expect(rows).toHaveLength(6)
    rows.forEach((row) => {
      expect(row).toHaveClass("h-14")
    })
  })

  it("does not stack a live region when nested", () => {
    render(<NetWorthCardSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("does not render a Spinner on re-exported card skeletons", () => {
    const { container } = render(
      <>
        <NetWorthCardSkeleton />
        <ActivityFeedCardSkeleton />
        <HoldingsTableCardSkeleton />
      </>,
    )
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument()
    expect(screen.getAllByRole("status", { name: "Loading" }).length).toBeGreaterThan(0)
  })
})
