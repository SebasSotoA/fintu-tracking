import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { act, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { ProductTour } from "./product-tour"
import {
  productTourStepKey,
  getProductTourStep,
} from "./product-intro-storage"
import { renderWithLocale } from "@/lib/i18n/test-utils"

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

function stubTourLayoutApis(): void {
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 80,
      height: 40,
      top: 20,
      left: 20,
      bottom: 60,
      right: 100,
      x: 20,
      y: 20,
      toJSON() {},
    } as DOMRect
  }
  Element.prototype.getClientRects = function () {
    return [{ width: 80, height: 40 }] as unknown as DOMRectList
  }
  HTMLElement.prototype.scrollIntoView = vi.fn()
}

function allAnchors(): ReactNode {
  return (
    <>
      <div data-tour="net-worth">nw</div>
      <button type="button" data-tour="add-cash">
        cash
      </button>
      <button type="button" data-tour="add-trade">
        trade
      </button>
      <a href="/performance" data-tour="nav-performance">
        Performance
      </a>
    </>
  )
}

function renderTour(
  overrides: {
    open?: boolean
    userId?: string
    onSkip?: () => void
    onComplete?: () => void
    locale?: "en" | "es"
    anchors?: ReactNode
  } = {},
) {
  const onSkip = overrides.onSkip ?? vi.fn()
  const onComplete = overrides.onComplete ?? vi.fn()
  const result = renderWithLocale(
    <main>
      {overrides.anchors ?? allAnchors()}
      <ProductTour
        open={overrides.open ?? true}
        userId={overrides.userId ?? "user-1"}
        onSkip={onSkip}
        onComplete={onComplete}
      />
    </main>,
    { locale: overrides.locale ?? "en" },
  )
  return { ...result, onSkip, onComplete }
}

describe("ProductTour", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    stubTourLayoutApis()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it("shows step 1 copy, padded kicker, Next, and Skip X when open", async () => {
    renderTour()

    expect(await screen.findByRole("heading", { name: "The question" })).toBeInTheDocument()
    expect(
      screen.getByText("After fees and FX, are you making or losing?"),
    ).toBeInTheDocument()
    expect(screen.getByText("01 / 04")).toBeInTheDocument()
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Skip intro" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Skip$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Intro progress" })).not.toBeInTheDocument()
  })

  it("advances with Next and completes on Get started", async () => {
    const user = userEvent.setup()
    const { onComplete, onSkip } = renderTour()

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("heading", { name: "Record cash" })).toBeInTheDocument()
    expect(screen.getByText("02 / 04")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("heading", { name: "Record trades" })).toBeInTheDocument()
    expect(screen.getByText("Buys and sells.")).toBeInTheDocument()
    expect(screen.getByText("03 / 04")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("heading", { name: "Then read" })).toBeInTheDocument()
    expect(
      screen.getByText("Dashboard and Performance answer the question."),
    ).toBeInTheDocument()
    expect(screen.getByText("04 / 04")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Get started" }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onSkip).not.toHaveBeenCalled()
  })

  it("skips the entire tour via the X button", async () => {
    const user = userEvent.setup()
    const { onSkip, onComplete } = renderTour()

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Skip intro" }))
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("skips the entire tour via Escape", async () => {
    const user = userEvent.setup()
    const { onSkip } = renderTour()

    await screen.findByRole("heading", { name: "The question" })
    await user.keyboard("{Escape}")
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it("skips the entire tour via a dim pane click", async () => {
    const { onSkip, onComplete } = renderTour()

    await screen.findByRole("heading", { name: "The question" })
    const pane = document.querySelector("[data-tour-pane]")
    expect(pane).toBeTruthy()
    fireEvent.click(pane!)
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("ignores Escape while a nested dialog overlay is open", async () => {
    const user = userEvent.setup()
    const { onSkip } = renderTour()

    await screen.findByRole("heading", { name: "The question" })
    const overlay = document.createElement("div")
    overlay.setAttribute("data-slot", "dialog-overlay")
    document.body.appendChild(overlay)
    try {
      await user.keyboard("{Escape}")
      expect(onSkip).not.toHaveBeenCalled()
    } finally {
      overlay.remove()
    }
  })

  it("skips a missing-anchor step and keeps the kicker contiguous", async () => {
    const user = userEvent.setup()
    renderTour({
      anchors: (
        <>
          <div data-tour="net-worth">nw</div>
          <button type="button" data-tour="add-trade">
            trade
          </button>
          <a href="/performance" data-tour="nav-performance">
            Performance
          </a>
        </>
      ),
    })

    expect(await screen.findByRole("heading", { name: "The question" })).toBeInTheDocument()
    expect(screen.getByText("01 / 03")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("heading", { name: "Record trades" })).toBeInTheDocument()
    expect(screen.getByText("02 / 03")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Record cash" })).not.toBeInTheDocument()
  })

  it("uses a visible cash-flows link when add-cash is missing", async () => {
    const user = userEvent.setup()
    renderTour({
      anchors: (
        <>
          <div data-tour="net-worth">nw</div>
          <a href="/cash-flows">Cash Flows</a>
          <button type="button" data-tour="add-trade">
            trade
          </button>
          <a href="/performance" data-tour="nav-performance">
            Performance
          </a>
        </>
      ),
    })

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("heading", { name: "Record cash" })).toBeInTheDocument()
    expect(screen.getByText("02 / 04")).toBeInTheDocument()
  })

  it("renders nothing and does not skip when every anchor is missing", async () => {
    const { onSkip, onComplete } = renderTour({ anchors: <div>empty</div> })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
    expect(document.querySelector("[data-tour-overlay]")).toBeNull()
    expect(onSkip).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("resumes from the sessionStorage step", async () => {
    sessionStorage.setItem(productTourStepKey("user-1"), "3")
    renderTour()

    expect(await screen.findByRole("heading", { name: "Record trades" })).toBeInTheDocument()
    expect(screen.getByText("03 / 04")).toBeInTheDocument()
  })

  it("persists the current step on Next and on unmount", async () => {
    const user = userEvent.setup()
    const { onSkip, unmount } = renderTour()

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Next" }))
    await screen.findByRole("heading", { name: "Record cash" })
    expect(getProductTourStep("user-1")).toBe(2)

    unmount()
    expect(onSkip).not.toHaveBeenCalled()
    expect(getProductTourStep("user-1")).toBe(2)
  })

  it("paints a four-rect dim overlay at z-40 with no backdrop-blur", async () => {
    renderTour()
    await screen.findByRole("heading", { name: "The question" })

    const overlay = document.querySelector("[data-tour-overlay]")
    expect(overlay).toHaveClass("z-40")
    expect(overlay).toHaveClass("pointer-events-none")
    expect(overlay?.className).not.toMatch(/backdrop-blur/)

    const panes = document.querySelectorAll("[data-tour-pane]")
    expect(panes).toHaveLength(4)
    panes.forEach((pane) => {
      expect(pane).toHaveClass("z-40")
      expect(pane).toHaveClass("pointer-events-auto")
      expect(pane.className).not.toMatch(/backdrop-blur/)
      expect(pane).toHaveClass("bg-foreground/45")
    })

    const hole = document.querySelector("[data-tour-hole]")
    expect(hole).toHaveClass("rounded-xl")
    expect(hole).toHaveClass("ring-1")
    expect(hole).toHaveClass("ring-primary/40")
    expect(hole).not.toHaveClass("ring-2")
    expect(hole).not.toHaveClass("ring-primary/70")
    expect(hole?.className).not.toMatch(/shadow-\[0_0_0_6px/)
  })

  it("uses elevated glass, a 3px primary rail, and z-40 on this popover only", async () => {
    renderTour()
    const card = await screen.findByRole("dialog")
    expect(card).toHaveClass("z-40")
    expect(card).toHaveClass("w-72")
    expect(card).toHaveAttribute("data-align", "center")
    expect(card.className).toContain("from-white/[0.07]")
    expect(card.className).toContain("backdrop-blur-[12px]")
    expect(card).toHaveAttribute("aria-modal", "false")
    expect(card).toHaveClass("overflow-visible")
    expect(card).not.toHaveClass("overflow-hidden")

    const rail = card.querySelector("[data-tour-rail]")
    expect(rail).toHaveClass("w-[3px]")
    expect(rail).toHaveClass("bg-primary")
    expect(rail).toHaveAttribute("aria-hidden", "true")

    const clip = rail?.parentElement
    expect(clip).toHaveClass("overflow-hidden")
    expect(clip).toHaveClass("z-10")

    const arrow = document.querySelector("[data-tour-arrow]")
    expect(arrow).toBeTruthy()
    expect(arrow).toHaveAttribute("aria-hidden", "true")
    expect(card.contains(arrow)).toBe(true)
    expect(clip?.contains(arrow)).toBe(false)
    expect(arrow).toHaveClass("fill-card")
    expect(arrow).not.toHaveClass("rotate-45")
    expect(arrow).not.toHaveClass("rounded-[2px]")
  })

  it("renders Spanish performance copy on the last placeable step", async () => {
    const user = userEvent.setup()
    renderTour({ locale: "es" })

    await screen.findByRole("heading", { name: "La pregunta" })
    await user.click(screen.getByRole("button", { name: "Siguiente" }))
    await user.click(screen.getByRole("button", { name: "Siguiente" }))
    await user.click(screen.getByRole("button", { name: "Siguiente" }))

    expect(await screen.findByRole("heading", { name: "Luego lee" })).toBeInTheDocument()
    expect(
      screen.getByText("El panel y Rendimiento responden la pregunta."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Empezar" })).toBeInTheDocument()
  })

  it("marks the current step's anchor with data-tour-current", async () => {
    const user = userEvent.setup()
    renderTour()

    const netWorth = document.querySelector('[data-tour="net-worth"]')
    const cash = screen.getByRole("button", { name: "cash" })
    const trade = screen.getByRole("button", { name: "trade" })
    const performance = screen.getByRole("link", { name: "Performance" })

    await screen.findByRole("heading", { name: "The question" })
    expect(netWorth).toHaveAttribute("data-tour-current", "")
    expect(cash).not.toHaveAttribute("data-tour-current")
    expect(trade).not.toHaveAttribute("data-tour-current")
    expect(performance).not.toHaveAttribute("data-tour-current")

    await user.click(screen.getByRole("button", { name: "Next" }))
    await screen.findByRole("heading", { name: "Record cash" })
    expect(netWorth).not.toHaveAttribute("data-tour-current")
    expect(cash).toHaveAttribute("data-tour-current", "")
    expect(trade).not.toHaveAttribute("data-tour-current")

    await user.click(screen.getByRole("button", { name: "Next" }))
    await screen.findByRole("heading", { name: "Record trades" })
    expect(cash).not.toHaveAttribute("data-tour-current")
    expect(trade).toHaveAttribute("data-tour-current", "")
    expect(performance).not.toHaveAttribute("data-tour-current")

    await user.click(screen.getByRole("button", { name: "Next" }))
    await screen.findByRole("heading", { name: "Then read" })
    expect(trade).not.toHaveAttribute("data-tour-current")
    expect(performance).toHaveAttribute("data-tour-current", "")
  })
})
