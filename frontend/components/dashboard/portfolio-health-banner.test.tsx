import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { HealthAlert } from "@/hooks/use-portfolio-health"
import { PortfolioHealthBanner } from "./portfolio-health-banner"

const { mockAlerts } = vi.hoisted(() => ({
  mockAlerts: [] as HealthAlert[],
}))

vi.mock("@/hooks/use-portfolio-health", () => ({
  usePortfolioHealth: () => ({ alerts: mockAlerts }),
}))

function renderBanner(alerts: HealthAlert[] = []) {
  mockAlerts.splice(0, mockAlerts.length, ...alerts)
  return render(<PortfolioHealthBanner />)
}

const sampleAlerts: HealthAlert[] = [
  {
    type: "concentration",
    severity: "warning",
    message: "AAPL represents 35% of your portfolio.",
    details: "Concentration risk details",
  },
  {
    type: "stale_prices",
    severity: "destructive",
    message: "Prices are stale.",
  },
]

describe("PortfolioHealthBanner", () => {
  beforeEach(() => {
    mockAlerts.splice(0, mockAlerts.length)
  })

  it("renders an empty state when there are no alerts", () => {
    renderBanner()
    expect(screen.getByText("No notifications")).toBeInTheDocument()
  })

  it("renders all active alerts", () => {
    renderBanner(sampleAlerts)
    expect(screen.getByText(sampleAlerts[0].message)).toBeInTheDocument()
    expect(screen.getByText(sampleAlerts[1].message)).toBeInTheDocument()
    expect(screen.getByText(sampleAlerts[0].details as string)).toBeInTheDocument()
  })

  it("does not render dismiss buttons for alerts", () => {
    renderBanner(sampleAlerts)
    expect(screen.queryByRole("button", { name: "Dismiss alert" })).not.toBeInTheDocument()
  })
})
