import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CashFlowsPageSkeleton } from "./cash-flows-page-skeleton"

describe("CashFlowsPageSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<CashFlowsPageSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<CashFlowsPageSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("nests table and sparkline tokens without stacking live regions", () => {
    render(<CashFlowsPageSkeleton />)
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByTestId("table-page-skeleton")).toBeInTheDocument()
    expect(screen.getByTestId("chart-panel-skeleton-plot")).toHaveClass("h-[140px]")
  })
})
