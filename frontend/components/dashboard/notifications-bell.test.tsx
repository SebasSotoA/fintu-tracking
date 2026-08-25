import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NotificationsBell } from "./notifications-bell"
import type { HealthAlert } from "@/hooks/use-portfolio-health"

const { mockAlerts } = vi.hoisted(() => ({
  mockAlerts: [] as HealthAlert[],
}))

vi.mock("@/hooks/use-portfolio-health", () => ({
  usePortfolioHealth: () => ({ alerts: mockAlerts }),
}))

describe("NotificationsBell", () => {
  it("renders the bell button with no badge when there are no alerts", () => {
    const { container } = render(<NotificationsBell />)
    expect(screen.getByTestId("notifications-bell")).toBeInTheDocument()
    expect(screen.queryByTestId("notifications-bell-badge")).not.toBeInTheDocument()
    expect(container).toBeInTheDocument()
  })

  it("renders a badge with the alert count when there are alerts", () => {
    mockAlerts.splice(0, mockAlerts.length, {
      type: "stale_prices",
      severity: "warning",
      message: "All market prices are stale (>24h). Click Refresh Prices to update.",
    })
    render(<NotificationsBell />)
    const badge = screen.getByTestId("notifications-bell-badge")
    expect(badge).toHaveTextContent("1")
  })
})