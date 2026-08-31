import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { FxRateManager } from "./fx-rate-manager"

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === "fx-current-rate") {
      return {
        data: { rate: "4100", date: "2026-08-30" },
        isLoading: false,
        isFetching: false,
      }
    }
    return { data: [], isLoading: false, isFetching: false }
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock("./fx-rate-sparkline", () => ({
  FxRateSparkline: () => <div data-testid="fx-rate-sparkline" />,
}))

describe("FxRateManager swap control", () => {
  it("styles the converter swap arrows with primary indigo, not sky or chart-3", () => {
    const { container } = render(<FxRateManager />)

    const swap = container.querySelector("button.pointer-events-none")
    expect(swap).toBeTruthy()
    expect(swap).toHaveAttribute("tabindex", "-1")
    expect(swap?.className).toContain("text-primary")
    expect(swap?.className).toContain("border-primary/40")
    expect(swap?.className).toContain("bg-primary/15")
    expect(swap?.className).not.toMatch(/sky|chart-3/)

    const iconClass = swap?.querySelector("svg")?.getAttribute("class") ?? ""
    expect(iconClass).toContain("text-primary")
    expect(iconClass).not.toMatch(/sky|chart-3/)
  })
})
