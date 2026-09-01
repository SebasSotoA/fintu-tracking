import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import {
  ActivityFeedCardSkeleton,
  HoldingsTableCardSkeleton,
  NetWorthCardSkeleton,
} from "./dashboard-card-skeleton"

describe("DashboardCardSkeleton", () => {
  it("NetWorthCardSkeleton renders card chrome with portfolio title", () => {
    const { container } = renderWithLocale(<NetWorthCardSkeleton />)
    expect(screen.getByText("Portfolio total")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(2)
  })

  it("ActivityFeedCardSkeleton renders card chrome with recent activity title", () => {
    const { container } = renderWithLocale(<ActivityFeedCardSkeleton />)
    expect(screen.getByText("Recent Activity")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(4)
  })

  it("HoldingsTableCardSkeleton renders card chrome with current holdings title", () => {
    const { container } = renderWithLocale(<HoldingsTableCardSkeleton />)
    expect(screen.getByText("Current Holdings")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(5)
  })
})
