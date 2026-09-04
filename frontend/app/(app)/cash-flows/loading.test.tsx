import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import CashFlowsLoading from "./loading"

describe("CashFlowsLoading", () => {
  it("renders CashFlowsPageSkeleton as a status region", () => {
    render(<CashFlowsLoading />)

    const status = screen.getByRole("status", { name: "Loading" })
    expect(status.querySelector('[data-testid="table-page-skeleton"]')).not.toBeNull()
    expect(screen.getByTestId("chart-panel-skeleton-plot")).toBeInTheDocument()
  })

  it("does not use a raw bg-muted pulse placeholder", () => {
    const { container } = render(<CashFlowsLoading />)

    expect(container.querySelector(".bg-muted")).not.toBeInTheDocument()
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument()
  })
})
