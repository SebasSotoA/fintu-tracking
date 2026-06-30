import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardEmptyState } from "./dashboard-empty-state"

vi.mock("@/components/trades/add-trade-dialog", () => ({
  AddTradeDialog: ({ children }: { children?: React.ReactNode }) => (
    <button type="button" data-testid="add-trade-dialog-trigger">
      {children ?? "Add Trade"}
    </button>
  ),
}))

vi.mock("@/components/cash-flows/add-cash-flow-dialog", () => ({
  AddCashFlowDialog: ({ children }: { children?: React.ReactNode }) => (
    <button type="button" data-testid="add-cash-flow-dialog-trigger">
      {children ?? "Add Cash Flow"}
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

describe("DashboardEmptyState", () => {
  it("renders shared EmptyState with title and description", () => {
    render(<DashboardEmptyState />)

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByTestId("empty-state-title")).toHaveTextContent("No portfolio data yet")
    expect(screen.getByTestId("empty-state-description")).toHaveTextContent("Add your first trade or deposit to start tracking your portfolio.")
  })

  it("provides CTAs to add a trade and add a cash flow", () => {
    render(<DashboardEmptyState />)

    const action = screen.getByTestId("empty-state-action")
    expect(action).toBeInTheDocument()
    expect(screen.getByTestId("add-trade-dialog-trigger")).toBeInTheDocument()
    expect(screen.getByTestId("add-cash-flow-dialog-trigger")).toBeInTheDocument()
  })
})
