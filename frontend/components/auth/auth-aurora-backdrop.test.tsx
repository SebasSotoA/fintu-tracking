import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthAuroraBackdrop } from "./auth-aurora-backdrop"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

vi.mock("@/components/auth/aurora", () => ({
  default: function AuroraMock({ colorStops }: { colorStops?: string[] }) {
    return (
      <div
        data-testid="aurora-mock"
        data-color-stops={colorStops?.join(",")}
      />
    )
  },
}))

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicAurora({ colorStops }: { colorStops?: string[] }) {
      return (
        <div
          data-testid="aurora-mock"
          data-color-stops={colorStops?.join(",")}
        />
      )
    },
}))

type MediaQueryListener = (event: MediaQueryListEvent) => void

function mockPrefersReducedMotion(initialMatches: boolean): {
  setMatches: (matches: boolean) => void
} {
  let matches = initialMatches
  const listeners = new Set<MediaQueryListener>()

  window.matchMedia = ((query: string): MediaQueryList => {
    const isReducedMotion = query === REDUCED_MOTION_QUERY
    return {
      get matches() {
        return isReducedMotion ? matches : false
      },
      media: query,
      onchange: null,
      addListener: (listener: MediaQueryListener) => {
        if (isReducedMotion) listeners.add(listener)
      },
      removeListener: (listener: MediaQueryListener) => {
        listeners.delete(listener)
      },
      addEventListener: (_type: string, listener: EventListener) => {
        if (isReducedMotion) listeners.add(listener as MediaQueryListener)
      },
      removeEventListener: (_type: string, listener: EventListener) => {
        listeners.delete(listener as MediaQueryListener)
      },
      dispatchEvent: () => false,
    } as MediaQueryList
  }) as typeof window.matchMedia

  return {
    setMatches(next: boolean) {
      matches = next
      const event = {
        matches: next,
        media: REDUCED_MOTION_QUERY,
      } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

describe("AuthAuroraBackdrop", () => {
  afterEach(() => {
    mockPrefersReducedMotion(false)
  })

  it("fills the viewport with navy #0B0F17 and never uses bg-primary", () => {
    mockPrefersReducedMotion(false)
    const { container } = render(<AuthAuroraBackdrop />)
    const backdrop = container.firstElementChild as HTMLElement

    expect(backdrop).toHaveAttribute("aria-hidden")
    expect(backdrop.className).toContain("fixed")
    expect(backdrop.className).toContain("inset-0")
    expect(backdrop.className).toContain("z-0")
    expect(backdrop.className).not.toContain("bg-primary")
    expect(backdrop).toHaveStyle({ backgroundColor: "#0B0F17" })
  })

  it("mounts aurora with Fintu indigo color stops when motion is allowed", () => {
    mockPrefersReducedMotion(false)
    render(<AuthAuroraBackdrop />)

    const aurora = screen.getByTestId("aurora-mock")
    expect(aurora).toBeInTheDocument()
    expect(aurora).toHaveAttribute("data-color-stops", "#4338CA,#6366F1,#4F46E5")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("skips WebGL when prefers-reduced-motion: reduce matches", () => {
    mockPrefersReducedMotion(true)
    const { container } = render(<AuthAuroraBackdrop />)

    expect(screen.queryByTestId("aurora-mock")).not.toBeInTheDocument()
    expect(container.querySelector("canvas")).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveStyle({ backgroundColor: "#0B0F17" })
  })

  it("unmounts aurora when reduced motion becomes preferred", () => {
    const media = mockPrefersReducedMotion(false)
    render(<AuthAuroraBackdrop />)
    expect(screen.getByTestId("aurora-mock")).toBeInTheDocument()

    act(() => {
      media.setMatches(true)
    })

    expect(screen.queryByTestId("aurora-mock")).not.toBeInTheDocument()
    expect(document.querySelector("canvas")).not.toBeInTheDocument()
  })
})
