import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { LandingSocialProof } from "./landing-social-proof"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"

describe("LandingSocialProof", () => {
  let observeCallback: IntersectionObserverCallback | null = null

  beforeEach(() => {
    observeCallback = null
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observeCallback = callback
      }
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("renders the heading and all stat labels", () => {
    render(<LandingSocialProof />)

    expect(screen.getByText("Every number accounted for")).toBeInTheDocument()
    expect(screen.getByText("FX Precision")).toBeInTheDocument()
    expect(screen.getByText("Fee Tracking")).toBeInTheDocument()
    expect(screen.getByText("XIRR Accuracy")).toBeInTheDocument()
    expect(screen.getByText("Asset Coverage")).toBeInTheDocument()
  })

  it("shows zero values before intersection", () => {
    render(<LandingSocialProof />)

    const values = screen.getAllByText("0", { exact: false })
    expect(values.length).toBeGreaterThan(0)
  })

  it("animates counters on intersection", () => {
    render(<LandingSocialProof />)

    // Simulate intersection
    act(() => {
      observeCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    // Run the RAF animation cycle
    act(() => {
      vi.advanceTimersByTime(1600)
    })

    // After animation completes, values should be at their targets.
    // Values and suffixes are rendered in separate elements, so match by combined text.
    expect(screen.getAllByText((_, node) => node?.textContent === "100%").length).toBe(2)
    expect(screen.getByText((_, node) => node?.textContent === "4")).toBeInTheDocument()
    expect(screen.getByText((_, node) => node?.textContent === "3")).toBeInTheDocument()
  })

  it("renders all stat descriptions", () => {
    render(<LandingSocialProof />)

    expect(
      screen.getByText(
        `Every ${MARKET_CONFIG.localCurrency} deposit reconciled at the trade-date FX rate`,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Fee categories mapped—deposit, transfer, trading, and closing"),
    ).toBeInTheDocument()
  })
})
