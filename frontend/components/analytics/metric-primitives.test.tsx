import { describe, expect, it } from "vitest"
import { screen, within } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { MetricLabel, StatCell } from "./metric-primitives"

describe("MetricLabel", () => {
  it("renders label text and accessible help trigger", () => {
    renderWithLocale(<MetricLabel label="Net return" tooltip="Return including cash." />)
    expect(screen.getByText("Net return")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about net return/i })).toBeInTheDocument()
  })

  it("uses compact tracking and min-w-0 so the label can shrink beside the help icon", () => {
    renderWithLocale(<MetricLabel label="COP enviado" tooltip="Pesos enviados." />)
    const label = screen.getByText("COP enviado")
    expect(label).toHaveClass("min-w-0", "truncate", "leading-tight", "tracking-wide")
    expect(label).not.toHaveClass("tracking-wider")
    expect(label.parentElement).toHaveClass("min-w-0")
  })
})

describe("StatCell", () => {
  it("renders value with primary styling when provided", () => {
    renderWithLocale(
      <StatCell
        label="Total gain/loss"
        tooltip="Gain tooltip"
        value="$1,000.00"
        valueClassName="text-primary"
      />,
    )
    const value = screen.getByText("$1,000.00")
    expect(value).toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: /about total gain\/loss/i })).toBeInTheDocument()
  })

  it("renders sub-value with dotted underline when subTooltip is set", () => {
    renderWithLocale(
      <StatCell
        label="Total fees"
        tooltip="Fees tooltip"
        value="$50.00"
        subValue="0.50% drag"
        subTooltip="Fee drag explanation"
      />,
    )
    const subButton = screen.getByRole("button", { name: "0.50% drag" })
    expect(subButton).toHaveClass("underline")
    expect(within(subButton).getByText("0.50% drag")).toBeInTheDocument()
  })
})
