import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
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
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => <div data-testid="fx-rate-reference-line" />,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

describe("FxRateSparkline series theme", () => {
  it("renders the USD/COP series in sky chart-3 without a pulsing halo", () => {
    const { container } = render(
      <FxRateSparkline points={[{ date: "2026-04-26", rate: "4100" }]} />,
    )

    const series = container.querySelector("[data-testid='fx-rate-series']")
    expect(series).toBeTruthy()
    expect(series?.getAttribute("data-stroke")).toBe("var(--chart-3)")
    expect(series?.getAttribute("data-stroke-width")).toBe("2.5")
    expect(series?.getAttribute("data-fill")).toBe("url(#fxRateGradient)")
    expect(series?.getAttribute("data-fill-opacity")).toBeNull()

    const lastDot = series?.querySelector("circle")
    expect(lastDot?.getAttribute("fill")).toBe("var(--chart-3)")

    const seriesAndDot = series?.outerHTML ?? ""
    expect(seriesAndDot).not.toContain("--primary")
    expect(seriesAndDot).not.toContain("--success")
    expect(seriesAndDot).not.toContain("--destructive")
    expect(container.querySelectorAll("animate")).toHaveLength(0)

    const gradient = container.querySelector("#fxRateGradient")
    expect(gradient).toBeTruthy()
    const stops = [...(gradient?.querySelectorAll("stop") ?? [])]
    expect(stops).toHaveLength(2)
    expect(stops[0].getAttribute("stop-color")).toBe("var(--chart-3)")
    expect(stops[0].getAttribute("stop-opacity")).toBe("0.32")
    expect(stops[1].getAttribute("stop-color")).toBe("var(--chart-3)")
    expect(stops[1].getAttribute("stop-opacity")).toBe("0")
  })
})
