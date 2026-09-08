"use client"

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { XIcon } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { elevatedGlassClass } from "@/components/ui/elevated-glass"
import { useLocale } from "@/components/locale-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"
import type { MessageKey } from "@/lib/i18n"
import {
  getProductTourStep,
  setProductTourStep,
} from "@/components/onboarding/product-intro-storage"

const HOLE_PAD = 12

const OVERLAY_PANE_CLASS =
  "fixed z-40 pointer-events-auto bg-foreground/45 dark:bg-background/70 motion-reduce:bg-foreground/60 dark:motion-reduce:bg-background/80"

type StepId = 1 | 2 | 3 | 4

interface StepDef {
  id: StepId
  tour: string
  fallback?: string
  titleKey: MessageKey
  bodyKey: MessageKey
}

const STEPS: readonly StepDef[] = [
  {
    id: 1,
    tour: "net-worth",
    titleKey: "onboarding.intro.slides.question.title",
    bodyKey: "onboarding.intro.slides.question.body",
  },
  {
    id: 2,
    tour: "add-cash",
    fallback: 'a[href="/cash-flows"]',
    titleKey: "onboarding.intro.slides.cash.title",
    bodyKey: "onboarding.intro.slides.cash.body",
  },
  {
    id: 3,
    tour: "add-trade",
    fallback: 'a[href="/trades"]',
    titleKey: "onboarding.intro.slides.trades.title",
    bodyKey: "onboarding.intro.slides.trades.body",
  },
  {
    id: 4,
    tour: "nav-performance",
    titleKey: "onboarding.intro.slides.performance.title",
    bodyKey: "onboarding.intro.slides.performance.body",
  },
]

interface HoleRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

interface Placement {
  step: StepDef
  anchor: Element
  hole: HoleRect
  displayIndex: number
  total: number
  isLast: boolean
}

interface ProductTourProps {
  open: boolean
  userId: string
  onSkip: () => void
  onComplete: () => void
}

export function ProductTour({ open, userId, onSkip, onComplete }: ProductTourProps) {
  const { t } = useLocale()
  const titleId = useId()
  const bodyId = useId()
  const primaryRef = useRef<HTMLButtonElement>(null)
  const finishedRef = useRef(false)
  const lastScrolledRef = useRef<StepId | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobileHook = useIsMobile()
  const isMobile = isMobileHook || inferMobile()
  const [epoch, setEpoch] = useState(0)
  const [stepId, setStepId] = useState<StepId>(() => coerceStepId(getProductTourStep(userId)))
  const stepIdRef = useRef(stepId)
  stepIdRef.current = stepId
  const [placement, setPlacement] = useState<Placement | null>(null)

  const bump = useCallback(() => {
    setEpoch((n) => n + 1)
  }, [])

  const finishSkip = useCallback(() => {
    finishedRef.current = true
    onSkip()
  }, [onSkip])

  const finishComplete = useCallback(() => {
    finishedRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    return () => {
      if (finishedRef.current) return
      setProductTourStep(userId, stepIdRef.current)
    }
  }, [userId])

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null)
      return
    }

    const placeable = collectPlaceable()
    if (placeable.length === 0) {
      setPlacement(null)
      return
    }

    const current = placeable.find((item) => item.step.id >= stepId)
    if (!current) {
      setPlacement(null)
      return
    }

    if (current.step.id !== stepId) {
      setStepId(current.step.id)
      setProductTourStep(userId, current.step.id)
    }

    let raf1 = 0
    let raf2 = 0
    if (lastScrolledRef.current !== current.step.id) {
      current.anchor.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: prefersReducedMotion ? "auto" : "smooth",
      })
      lastScrolledRef.current = current.step.id
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!finishedRef.current) bump()
        })
      })
    }

    const hole = paddedHole(current.anchor)
    const displayIndex = placeable.findIndex((item) => item.step.id === current.step.id) + 1
    const nextPlacement: Placement = {
      step: current.step,
      anchor: current.anchor,
      hole,
      displayIndex,
      total: placeable.length,
      isLast: displayIndex === placeable.length,
    }
    setPlacement((prev) => (placementsEqual(prev, nextPlacement) ? prev : nextPlacement))

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [open, stepId, userId, prefersReducedMotion, epoch, bump])

  useEffect(() => {
    if (!open) return

    const onBump = () => bump()
    window.addEventListener("resize", onBump)
    window.visualViewport?.addEventListener("resize", onBump)
    const main = document.querySelector("main")
    main?.addEventListener("scroll", onBump, { passive: true })

    const mo = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        if (mutation.type !== "childList") return false
        const nodes = [...mutation.addedNodes, ...mutation.removedNodes]
        if (nodes.length === 0) return false
        return nodes.some((node) => !isTourChrome(node))
      })
      if (relevant) onBump()
    })
    if (main) {
      mo.observe(main, { childList: true, subtree: true })
    }

    const ro = new ResizeObserver(onBump)
    const anchor = resolveAnchor(STEPS.find((step) => step.id === stepId) ?? STEPS[0])
    if (anchor) ro.observe(anchor)

    return () => {
      window.removeEventListener("resize", onBump)
      window.visualViewport?.removeEventListener("resize", onBump)
      main?.removeEventListener("scroll", onBump)
      mo.disconnect()
      ro.disconnect()
    }
  }, [open, stepId, bump])

  useEffect(() => {
    if (!placement) return
    const el = placement.anchor
    el.setAttribute("data-tour-current", "")
    return () => {
      el.removeAttribute("data-tour-current")
    }
  }, [placement])

  const handleNext = () => {
    const placeable = collectPlaceable()
    const idx = placeable.findIndex((item) => item.step.id === stepId)
    const next = idx >= 0 ? placeable[idx + 1] : placeable[0]
    if (!next) {
      finishComplete()
      return
    }
    setProductTourStep(userId, next.step.id)
    setStepId(next.step.id)
  }

  if (!open || !placement) return null

  const paddedStep = String(placement.displayIndex).padStart(2, "0")
  const paddedTotal = String(placement.total).padStart(2, "0")
  const popoverSide = popoverPlacement(placement.step.id, isMobile)
  const { hole } = placement
  const vw = window.innerWidth
  const vh = window.innerHeight

  return (
    <>
      <div
        data-tour-overlay
        className="pointer-events-none fixed inset-0 z-40"
      >
        <div
          data-tour-pane
          className={OVERLAY_PANE_CLASS}
          style={{ top: 0, left: 0, width: vw, height: hole.top }}
          onClick={finishSkip}
        />
        <div
          data-tour-pane
          className={OVERLAY_PANE_CLASS}
          style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }}
          onClick={finishSkip}
        />
        <div
          data-tour-pane
          className={OVERLAY_PANE_CLASS}
          style={{
            top: hole.top,
            left: hole.right,
            width: Math.max(0, vw - hole.right),
            height: hole.height,
          }}
          onClick={finishSkip}
        />
        <div
          data-tour-pane
          className={OVERLAY_PANE_CLASS}
          style={{
            top: hole.bottom,
            left: 0,
            width: vw,
            height: Math.max(0, vh - hole.bottom),
          }}
          onClick={finishSkip}
        />
        <div
          data-tour-hole
          aria-hidden
          className="pointer-events-none fixed rounded-xl ring-1 ring-primary/40"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      </div>

      <Popover modal={false} open>
        <PopoverAnchor asChild>
          <div
            aria-hidden
            className="pointer-events-none fixed"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          side={popoverSide.side}
          align={popoverSide.align}
          sideOffset={8}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            primaryRef.current?.focus()
          }}
          onEscapeKeyDown={(event) => {
            if (nestedOverlayOpen()) return
            event.preventDefault()
            finishSkip()
          }}
          className={cn(
            elevatedGlassClass,
            "z-40 w-72 overflow-visible rounded-xl border p-0 text-card-foreground outline-hidden",
            "motion-reduce:animate-none motion-reduce:duration-0",
          )}
        >
          <div className="relative z-10 overflow-hidden rounded-xl">
            <div
              data-tour-rail
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-primary"
            />
            <div className="flex items-start justify-between gap-2 px-4 pt-4">
              <div>
                <p className="font-mono text-xs font-medium tabular-nums tracking-widest text-muted-foreground">
                  {t("onboarding.intro.kicker", { step: paddedStep, total: paddedTotal })}
                </p>
                <span className="sr-only" aria-live="polite">
                  {t("onboarding.intro.stepOf", {
                    step: placement.displayIndex,
                    total: placement.total,
                  })}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("onboarding.intro.skipAria")}
                onClick={finishSkip}
              >
                <XIcon />
              </Button>
            </div>
            <div className="flex flex-col gap-2 px-4 pt-2 text-left">
              <h2
                id={titleId}
                className="font-sans text-base font-semibold leading-tight tracking-tight text-foreground"
              >
                {t(placement.step.titleKey)}
              </h2>
              <p
                id={bodyId}
                className="max-w-prose font-sans text-sm leading-relaxed text-muted-foreground"
              >
                {t(placement.step.bodyKey)}
              </p>
            </div>
            <div className="flex justify-end px-4 pt-4 pb-4">
              <Button
                key={placement.step.id}
                ref={primaryRef}
                type="button"
                variant="default"
                autoFocus
                onClick={handleNext}
              >
                {placement.isLast
                  ? t("onboarding.intro.getStarted")
                  : t("onboarding.intro.next")}
              </Button>
            </div>
          </div>
          <PopoverPrimitive.Arrow
            data-tour-arrow
            aria-hidden
            width={16}
            height={8}
            className="fill-card"
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

function coerceStepId(value: number | null): StepId {
  if (value === 2 || value === 3 || value === 4) return value
  return 1
}

function inferMobile(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(max-width: 767px)").matches
}

function isVisible(el: Element): boolean {
  return el.getClientRects().length > 0
}

function firstVisible(selector: string): Element | null {
  const nodes = document.querySelectorAll(selector)
  for (const node of nodes) {
    if (isVisible(node)) return node
  }
  return null
}

function resolveAnchor(step: StepDef): Element | null {
  const primary = firstVisible(`[data-tour="${step.tour}"]`)
  if (primary) return primary
  if (step.fallback) return firstVisible(step.fallback)
  return null
}

function collectPlaceable(): { step: StepDef; anchor: Element }[] {
  const result: { step: StepDef; anchor: Element }[] = []
  for (const step of STEPS) {
    const anchor = resolveAnchor(step)
    if (anchor) result.push({ step, anchor })
  }
  return result
}

function paddedHole(el: Element): HoleRect {
  const rect = el.getBoundingClientRect()
  const top = Math.max(0, rect.top - HOLE_PAD)
  const left = Math.max(0, rect.left - HOLE_PAD)
  const right = Math.min(window.innerWidth, rect.right + HOLE_PAD)
  const bottom = Math.min(window.innerHeight, rect.bottom + HOLE_PAD)
  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function nestedOverlayOpen(): boolean {
  return Boolean(
    document.querySelector('[data-slot="dialog-overlay"], [data-slot="drawer-overlay"]'),
  )
}

function isTourChrome(node: Node): boolean {
  const el = node instanceof Element ? node : node.parentElement
  if (!el) return false
  return (
    el.closest("[data-tour-overlay]") != null ||
    el.closest("[data-slot='popover-content']") != null ||
    el.closest("[data-slot='popover-anchor']") != null
  )
}

function placementsEqual(a: Placement | null, b: Placement): boolean {
  if (!a) return false
  return (
    a.step.id === b.step.id &&
    a.anchor === b.anchor &&
    a.displayIndex === b.displayIndex &&
    a.total === b.total &&
    a.isLast === b.isLast &&
    a.hole.top === b.hole.top &&
    a.hole.left === b.hole.left &&
    a.hole.width === b.hole.width &&
    a.hole.height === b.hole.height
  )
}

function popoverPlacement(
  stepId: StepId,
  isMobile: boolean,
): { side: "top" | "right" | "bottom" | "left"; align: "start" | "center" | "end" } {
  if (isMobile) {
    if (stepId === 1) return { side: "bottom", align: "center" }
    return { side: "top", align: "center" }
  }
  if (stepId === 1) return { side: "right", align: "center" }
  if (stepId === 4) return { side: "right", align: "center" }
  return { side: "left", align: "center" }
}
