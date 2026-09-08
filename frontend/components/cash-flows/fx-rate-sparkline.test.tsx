import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { EnglishLocaleWrapper } from "@/lib/i18n/test-utils"
import { FxRateSparkline } from "./fx-rate-sparkline"

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: (props: {
    stroke?: string
    fill?: string
    fillOpacity?: number
    strokeWidth?: number
    dot?: (dotProps: { cx: number; cy: number; index: number }) => ReactNode
  }) => {
    const lastDot =
      typeof props.dot === "function"
        ? props.dot({ cx: 12, cy: 20, index: 0 })
        : null
    return (
      <svg>
        <g
          data-testid="fx-rate-series"
          data-stroke={props.stroke}
          data-fill={props.fill}
          data-fill-opacity={props.fillOpacity}
          data-stroke-width={props.strokeWidth}
        >
          {lastDot}
        </g>
      </svg>
    )
  },
  XAxis: (props: { tick?: { fill?: string } }) => (
    <div data-testid="fx-xaxis" data-tick-fill={props.tick?.fill} />
  ),
  YAxis: (props: { tick?: { fill?: string } }) => (
    <div data-testid="fx-yaxis" data-tick-fill={props.tick?.fill} />
  ),
  Tooltip: () => null,
  ReferenceLine: () => <div data-testid="fx-rate-reference-line" />,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

describe("FxRateSparkline series theme", () => {
  it("shows a sparkline chart skeleton while loading", () => {
    render(
      <EnglishLocaleWrapper>
        <FxRateSparkline points={[]} isLoading />
      </EnglishLocaleWrapper>,
    )

    const status = screen.getByRole("status", { name: "Loading exchange rate chart" })
    expect(status.querySelector("[data-slot='skeleton']")).not.toBeNull()
    expect(screen.getByTestId("chart-panel-skeleton-plot")).toBeInTheDocument()
    expect(document.querySelector(".animate-spin")).toBeNull()
  })

  it("renders the USD/COP series in primary with a live ping on the current rate", () => {
    const { container } = render(
      <EnglishLocaleWrapper>
        <FxRateSparkline points={[{ date: "2026-04-26", rate: "4100" }]} />
      </EnglishLocaleWrapper>,
    )

    const series = container.querySelector("[data-testid='fx-rate-series']")
    expect(series).toBeTruthy()
    expect(series?.getAttribute("data-stroke")).toBe("var(--primary)")
    expect(series?.getAttribute("data-stroke-width")).toBe("2.5")
    expect(series?.getAttribute("data-fill")).toBe("url(#fxRateGradient)")
    expect(series?.getAttribute("data-fill-opacity")).toBeNull()

    const liveDot = series?.querySelector("[data-testid='fx-live-dot']")
    expect(liveDot).toBeTruthy()
    const circles = [...(liveDot?.querySelectorAll("circle") ?? [])]
    expect(circles).toHaveLength(2)
    expect(circles[0].querySelectorAll("animate")).toHaveLength(2)
    expect(circles[0].querySelector('animate[attributeName="r"]')?.getAttribute("dur")).toBe("1.8s")
    expect(circles[0].querySelector('animate[attributeName="opacity"]')?.getAttribute("dur")).toBe("1.8s")
    expect(circles[1].getAttribute("fill")).toBe("var(--primary)")
    expect(circles[1].getAttribute("r")).toBe("3")

    const seriesAndDot = series?.outerHTML ?? ""
    expect(seriesAndDot).not.toContain("--chart-3")
    expect(seriesAndDot).not.toContain("--success")
    expect(seriesAndDot).not.toContain("--destructive")
    expect(container.querySelectorAll("animate")).toHaveLength(2)

    const gradient = container.querySelector("#fxRateGradient")
    expect(gradient).toBeTruthy()
    const stops = [...(gradient?.querySelectorAll("stop") ?? [])]
    expect(stops).toHaveLength(2)
    expect(stops[0].getAttribute("stop-color")).toBe("var(--primary)")
    expect(stops[0].getAttribute("stop-opacity")).toBe("0.32")
    expect(stops[1].getAttribute("stop-color")).toBe("var(--primary)")
    expect(stops[1].getAttribute("stop-opacity")).toBe("0")
  })

  it("uses foreground tick fill on both axes", () => {
    const { container } = render(
      <EnglishLocaleWrapper>
        <FxRateSparkline points={[{ date: "2026-04-26", rate: "4100" }]} />
      </EnglishLocaleWrapper>,
    )

    expect(container.querySelector("[data-testid='fx-xaxis']")?.getAttribute("data-tick-fill")).toBe(
      "var(--foreground)",
    )
    expect(container.querySelector("[data-testid='fx-yaxis']")?.getAttribute("data-tick-fill")).toBe(
      "var(--foreground)",
    )
  })
})
