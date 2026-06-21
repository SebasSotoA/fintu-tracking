import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    expect(screen.getByText("Deposit COP")).toBeInTheDocument()
    expect(screen.getByText("FX Conversion")).toBeInTheDocument()
    expect(screen.getByText("Net Buying Power")).toBeInTheDocument()
    expect(screen.getByText("Execute Trade")).toBeInTheDocument()
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

  it("pauses auto-advance on mouse enter and resumes on mouse leave", async () => {
    const { container } = render(<LandingDemo />)

    // The onMouseEnter/onMouseLeave is on the div with landing-fade-up-delayed class
    const wrapper = container.querySelector(".landing-fade-up-delayed")
    expect(wrapper).not.toBeNull()

    // Hover to pause
    await userEvent.hover(wrapper!)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    // Still on step 1
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()

    // Unhover to resume
    await userEvent.unhover(wrapper!)
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument()
  })

  it("allows clicking a step dot to navigate directly", async () => {
    render(<LandingDemo />)

    const step4Button = screen.getByRole("button", { name: /Go to step 4/i })
    await userEvent.click(step4Button)

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument()
    expect(screen.getByText("Buy 1 VOO @ $453.79")).toBeInTheDocument()
  })
})
