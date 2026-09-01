import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
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
  it("renders a decorative non-interactive swap mark matching the converter cards", () => {
    const { container } = render(
      <EnglishLocaleWrapper>
        <FxRateManager />
      </EnglishLocaleWrapper>,
    )

    const swap = container.querySelector('[data-testid="fx-convert-swap"]')
    expect(swap).toBeTruthy()
    expect(swap?.tagName.toLowerCase()).not.toBe("button")
    expect(swap?.closest("button")).toBeNull()
    expect(swap?.className).toContain("border-border")
    expect(swap?.className).toContain("bg-card")
    expect(swap?.className).toContain("text-foreground")
    expect(swap?.className).not.toMatch(/text-primary|chart-3/)

    const iconClass = swap?.querySelector("svg")?.getAttribute("class") ?? ""
    expect(iconClass).toContain("text-foreground")
    expect(iconClass.replaceAll("dark:text-white", "")).not.toContain("text-white")
    expect(iconClass).not.toMatch(/text-primary|chart-3/)
  })
})
