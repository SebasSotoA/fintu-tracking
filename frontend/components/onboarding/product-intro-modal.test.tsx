import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { act, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductIntroModal } from "./product-intro-modal"
import { renderWithLocale } from "@/lib/i18n/test-utils"

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

function renderIntro(overrides: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onComplete?: () => void
} = {}) {
  const onOpenChange = overrides.onOpenChange ?? vi.fn()
  const onComplete = overrides.onComplete ?? vi.fn()
  const result = renderWithLocale(
    <ProductIntroModal
      open={overrides.open ?? true}
      onOpenChange={onOpenChange}
      onComplete={onComplete}
    />,
  )
  return { ...result, onOpenChange, onComplete }
}

describe("ProductIntroModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows slide 1 copy, kicker, skip, and next when open", () => {
    renderIntro()

    expect(screen.getByText("01 / 03")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "The question" })).toBeInTheDocument()
    expect(
      screen.getByText("After fees and FX, are you making or losing?"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Skip intro" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument()
  })

  it("advances slides with Next and completes on Get started", async () => {
    const user = userEvent.setup()
    const { onComplete } = renderIntro()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByRole("heading", { name: "Record cash" })).toBeInTheDocument()
    expect(screen.getByText("02 / 03")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(
      screen.getByRole("heading", { name: "Record trades, then read" }),
    ).toBeInTheDocument()
    expect(screen.getByText("03 / 03")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Get started" }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("treats Skip as dismiss and does not call onComplete", async () => {
    const user = userEvent.setup()
    const { onOpenChange, onComplete } = renderIntro()

    await user.click(screen.getByRole("button", { name: "Skip intro" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("treats Escape as Skip", async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderIntro()

    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("treats overlay click as Skip", async () => {
    const { onOpenChange, onComplete } = renderIntro()

    const overlay = document.querySelector("[data-slot=dialog-overlay]")
    expect(overlay).toBeTruthy()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    fireEvent.pointerDown(overlay!, { pointerType: "mouse", button: 0 })

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("uses indicator dots that are not buttons", () => {
    renderIntro()

    const progress = screen.getByRole("navigation", { name: "Intro progress" })
    expect(progress.querySelectorAll("button")).toHaveLength(0)
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("applies the frosted overlay classes on this dialog only", () => {
    renderIntro()

    const overlay = document.querySelector("[data-slot=dialog-overlay]")
    expect(overlay).toHaveClass("backdrop-blur-md")
    expect(overlay).toHaveClass("bg-foreground/20")
    expect(overlay).not.toHaveClass("bg-black/50")
  })
})
