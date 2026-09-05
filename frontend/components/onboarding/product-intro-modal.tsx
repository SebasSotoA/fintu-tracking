"use client"

import { useState } from "react"
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { useLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import type { MessageKey } from "@/lib/i18n"

const INTRO_OVERLAY_CLASS =
  "bg-foreground/20 backdrop-blur-md dark:bg-background/50 dark:backdrop-blur-md motion-reduce:backdrop-blur-none motion-reduce:bg-foreground/40 dark:motion-reduce:bg-background/75"

const INTRO_CONTENT_CLASS =
  "relative flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-card bg-card/90 p-0 text-card-foreground shadow-[0_12px_32px_rgba(0,0,0,0.38)] backdrop-blur-md motion-reduce:animate-none motion-reduce:duration-0 sm:max-w-xl"

const VIGNETTE_SHELL_CLASS =
  "relative flex h-20 w-full flex-col justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-card px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md md:h-32 md:w-36 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:content-['']"

type SlideId = 1 | 2 | 3

const SLIDE_COPY: Record<SlideId, { title: MessageKey; body: MessageKey }> = {
  1: {
    title: "onboarding.intro.slides.question.title",
    body: "onboarding.intro.slides.question.body",
  },
  2: {
    title: "onboarding.intro.slides.cash.title",
    body: "onboarding.intro.slides.cash.body",
  },
  3: {
    title: "onboarding.intro.slides.trades.title",
    body: "onboarding.intro.slides.trades.body",
  },
}

const LOOP_CHIPS = [
  "onboarding.intro.vignette.trades",
  "onboarding.intro.vignette.dashboard",
  "onboarding.intro.vignette.performance",
] as const satisfies readonly MessageKey[]

interface ProductIntroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function ProductIntroModal({
  open,
  onOpenChange,
  onComplete,
}: ProductIntroModalProps) {
  const { t } = useLocale()
  const [slide, setSlide] = useState<SlideId>(1)
  const copy = SLIDE_COPY[slide]
  const paddedStep = String(slide).padStart(2, "0")

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSlide(1)
      onOpenChange(false)
      return
    }
    onOpenChange(true)
  }

  const handleSkip = () => {
    handleOpenChange(false)
  }

  const handlePrimary = () => {
    if (slide < 3) {
      setSlide((current) => (current + 1) as SlideId)
      return
    }
    onComplete()
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange} dismissible>
      <ResponsiveDialogContent
        showCloseButton={false}
        overlayClassName={INTRO_OVERLAY_CLASS}
        className={INTRO_CONTENT_CLASS}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-primary md:rounded-l-xl max-md:inset-x-0 max-md:top-0 max-md:bottom-auto max-md:h-[3px] max-md:w-full max-md:rounded-t-xl"
        />

        <div className="relative flex flex-1 flex-col gap-6 px-6 pt-6">
          <div className="flex items-center justify-between gap-4">
            <ProductIntroKicker
              kicker={t("onboarding.intro.kicker", { step: paddedStep })}
              stepOf={t("onboarding.intro.stepOf", { step: slide })}
            />
            <ProductIntroDots
              current={slide}
              label={t("onboarding.intro.progressAria")}
            />
          </div>

          <div
            key={slide}
            className="grid grid-cols-1 items-center gap-6 duration-150 motion-reduce:duration-0 md:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <ProductIntroVignette slide={slide} />
            <ResponsiveDialogHeader className="flex flex-col gap-2 text-left">
              <ResponsiveDialogTitle className="text-left text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl">
                {t(copy.title)}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="max-w-prose text-left text-sm leading-relaxed text-muted-foreground">
                {t(copy.body)}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
          </div>
        </div>

        <ResponsiveDialogFooter className="flex flex-col-reverse gap-2 px-6 pt-6 pb-6 pb-safe sm:flex-row sm:items-center sm:justify-between max-md:grid max-md:grid-cols-2 max-md:flex-none">
          <Button
            type="button"
            variant="ghost"
            aria-label={t("onboarding.intro.skipAria")}
            onClick={handleSkip}
          >
            {t("onboarding.intro.skip")}
          </Button>
          <Button
            key={slide}
            type="button"
            variant="default"
            autoFocus
            onClick={handlePrimary}
          >
            {slide < 3 ? t("onboarding.intro.next") : t("onboarding.intro.getStarted")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function ProductIntroKicker({
  kicker,
  stepOf,
}: {
  kicker: string
  stepOf: string
}) {
  return (
    <div aria-live="polite">
      <p className="font-mono text-xs font-medium tabular-nums tracking-widest text-muted-foreground">
        {kicker}
      </p>
      <span className="sr-only">{stepOf}</span>
    </div>
  )
}

function ProductIntroDots({
  current,
  label,
}: {
  current: SlideId
  label: string
}) {
  return (
    <nav aria-label={label} className="flex items-center gap-2">
      {([1, 2, 3] as const).map((step) => (
        <span
          key={step}
          role="presentation"
          className={cn(
            "h-2 rounded-full",
            step === current ? "w-4 bg-primary" : "w-2 bg-muted",
          )}
        />
      ))}
    </nav>
  )
}

function ProductIntroVignette({ slide }: { slide: SlideId }) {
  const { t } = useLocale()

  return (
    <div aria-hidden className={VIGNETTE_SHELL_CLASS}>
      {slide === 1 ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("onboarding.intro.vignette.afterCosts")}
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">?</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="size-3 text-success" />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {t("onboarding.intro.vignette.making")}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <ArrowDownRight className="size-3 text-destructive" />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {t("onboarding.intro.vignette.losing")}
              </span>
            </span>
          </div>
        </div>
      ) : slide === 2 ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("onboarding.intro.vignette.cashMoved")}
          </p>
          <p className="flex items-center gap-1 font-mono text-sm font-medium text-foreground">
            <ArrowLeftRight className="size-4 text-primary" />
            {t("onboarding.intro.vignette.copToUsd")}
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {t("onboarding.intro.vignette.fxSample")}
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {t("onboarding.intro.vignette.brokerFx")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("onboarding.intro.vignette.dailyLoop")}
          </p>
          <div className="flex flex-col gap-1">
            {LOOP_CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-primary-container/80 px-2 py-1 text-xs font-medium text-on-primary-container"
              >
                {t(chip)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
