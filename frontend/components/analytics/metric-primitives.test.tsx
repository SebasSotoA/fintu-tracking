import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MetricLabel, StatCell } from "./metric-primitives"

describe("MetricLabel", () => {
  it("renders label text and accessible help trigger", () => {
    render(<MetricLabel label="Net return" tooltip="Return including cash." />)
    expect(screen.getByText("Net return")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /about net return/i })).toBeInTheDocument()
  })
})

describe("StatCell", () => {
  it("renders value with primary styling when provided", () => {
    render(
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
    render(
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
