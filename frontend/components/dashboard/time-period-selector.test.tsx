import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TimePeriodSelector } from "./time-period-selector"

describe("TimePeriodSelector", () => {
  it("renders all period options", () => {
    render(<TimePeriodSelector value="1M" onChange={vi.fn()} />)

    expect(screen.getByText("1M")).toBeInTheDocument()
    expect(screen.getByText("3M")).toBeInTheDocument()
    expect(screen.getByText("YTD")).toBeInTheDocument()
    expect(screen.getByText("1Y")).toBeInTheDocument()
    expect(screen.getByText("All")).toBeInTheDocument()
  })

  it("calls onChange when a different period is selected", async () => {
    const onChange = vi.fn()
    render(<TimePeriodSelector value="1M" onChange={onChange} />)

    await userEvent.click(screen.getByText("YTD"))
    expect(onChange).toHaveBeenCalledWith("YTD")
  })

  it("does not call onChange when the same period is clicked", async () => {
    const onChange = vi.fn()
    render(<TimePeriodSelector value="ALL" onChange={onChange} />)

    await userEvent.click(screen.getByText("All"))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("highlights the active period", () => {
    render(<TimePeriodSelector value="3M" onChange={vi.fn()} />)

    const active = screen.getByText("3M").closest("button")
    expect(active).not.toBeNull()
    expect(active?.getAttribute("data-state")).toBe("on")
  })
})
