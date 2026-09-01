import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { PerformanceEmptyState } from "./performance-empty-state"

vi.mock("@/components/trades/add-trade-dialog", () => ({
  AddTradeDialog: ({ children }: { children?: React.ReactNode }) => (
    <button type="button" data-testid="add-trade-dialog-trigger">
      {children ?? "Add trade"}
    </button>
  ),
}))

vi.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
    <div data-testid="empty-state">
      <p data-testid="empty-state-title">{title}</p>
      {description && <p data-testid="empty-state-description">{description}</p>}
      {action && <div data-testid="empty-state-action">{action}</div>}
    </div>
  ),
}))

describe("PerformanceEmptyState", () => {
  it("renders shared EmptyState with title and description", () => {
    renderWithLocale(<PerformanceEmptyState />)

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByTestId("empty-state-title")).toHaveTextContent("No performance data yet")
    expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
      "Add trades and cash flows to calculate returns, fees, and XIRR.",
    )
  })

  it("renders Spanish heading when locale is es", () => {
    renderWithLocale(<PerformanceEmptyState />, { locale: "es" })

    expect(screen.getByTestId("empty-state-title")).toHaveTextContent(
      "Aún no hay datos de rendimiento",
    )
    expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
      "Agrega operaciones y flujos de caja para calcular retornos, comisiones y XIRR.",
    )
  })

  it("provides CTA to add a trade", () => {
    renderWithLocale(<PerformanceEmptyState />)

    const action = screen.getByTestId("empty-state-action")
    expect(action).toBeInTheDocument()
    expect(screen.getByTestId("add-trade-dialog-trigger")).toBeInTheDocument()
  })
})
