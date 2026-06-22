import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { LandingDemo } from "./landing-demo"

describe("LandingDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the heading and all step labels", () => {
    render(<LandingDemo />)

    expect(screen.getByText("How it works")).toBeInTheDocument()
    // Step labels appear in the active display and the progress bar.
    expect(screen.getAllByText("Deposit COP").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("FX Conversion").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Net Buying Power").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Execute Trade").length).toBeGreaterThanOrEqual(1)
  })

  it("shows the first step initially", () => {
    render(<LandingDemo />)

    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()
    expect(screen.getByText("COP 500,000")).toBeInTheDocument()
  })

  it("advances to the next step after STEP_DURATION", () => {
    render(<LandingDemo />)

    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument()
    expect(screen.getByText("COP 4,127.50/USD")).toBeInTheDocument()
  })

  it("wraps back to the first step after the last step", () => {
    render(<LandingDemo />)

    // Advance through all 4 steps
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(3500)
      })
    }

    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()
  })

  it("pauses auto-advance on mouse enter and resumes on mouse leave", () => {
    const { container } = render(<LandingDemo />)

    const wrapper = container.querySelector(".landing-fade-up-delayed")
    expect(wrapper).not.toBeNull()

    fireEvent.mouseEnter(wrapper!)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()

    fireEvent.mouseLeave(wrapper!)
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument()
  })

  it("allows clicking a step dot to navigate directly", () => {
    render(<LandingDemo />)

    const step4Button = screen.getByRole("button", { name: /Go to step 4/i })
    fireEvent.click(step4Button)

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument()
    expect(screen.getByText("Buy 1 VOO @ $453.79")).toBeInTheDocument()
  })
})
