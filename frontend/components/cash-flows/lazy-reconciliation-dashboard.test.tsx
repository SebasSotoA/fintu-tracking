import type { ComponentType } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { LazyReconciliationDashboard } from "./lazy-reconciliation-dashboard"

vi.mock("next/dynamic", () => ({
  default: (
    _importer: () => Promise<unknown>,
    options?: { loading?: ComponentType },
  ) => {
    const Loading = options?.loading
    function DynamicLoadingStub() {
      return Loading ? <Loading /> : null
    }
    return DynamicLoadingStub
  },
}))

describe("LazyReconciliationDashboard", () => {
  it("shows ChartPanelSkeleton while the dashboard chunk loads", () => {
    render(<LazyReconciliationDashboard />)

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    expect(screen.getByTestId("chart-panel-skeleton-plot")).toBeInTheDocument()
  })

  it("does not use a raw bg-muted pulse placeholder", () => {
    const { container } = render(<LazyReconciliationDashboard />)

    expect(container.querySelector(".bg-muted")).not.toBeInTheDocument()
    expect(container.querySelector(".h-32")).not.toBeInTheDocument()
  })
})
