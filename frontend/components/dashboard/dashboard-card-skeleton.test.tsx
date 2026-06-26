import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  ActivityFeedCardSkeleton,
  HoldingsTableCardSkeleton,
  NetWorthCardSkeleton,
} from "./dashboard-card-skeleton"

describe("DashboardCardSkeleton", () => {
  it("NetWorthCardSkeleton renders card chrome with portfolio title", () => {
    const { container } = render(<NetWorthCardSkeleton />)
    expect(screen.getByText("Portfolio total")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(2)
  })

  it("ActivityFeedCardSkeleton renders card chrome with recent activity title", () => {
    const { container } = render(<ActivityFeedCardSkeleton />)
    expect(screen.getByText("Recent Activity")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(4)
  })

  it("HoldingsTableCardSkeleton renders card chrome with current holdings title", () => {
    const { container } = render(<HoldingsTableCardSkeleton />)
    expect(screen.getByText("Current Holdings")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(5)
  })
})
