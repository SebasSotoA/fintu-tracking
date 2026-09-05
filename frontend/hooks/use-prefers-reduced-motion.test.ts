import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

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

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    mockPrefersReducedMotion(false)
  })

  it("returns false when the OS does not prefer reduced motion", () => {
    mockPrefersReducedMotion(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it("returns true when matchMedia matches prefers-reduced-motion: reduce", () => {
    mockPrefersReducedMotion(true)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })

  it("updates when the media query change event fires", () => {
    const media = mockPrefersReducedMotion(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      media.setMatches(true)
    })

    expect(result.current).toBe(true)
  })
})
