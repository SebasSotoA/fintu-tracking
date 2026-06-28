"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Building2,
  ChartLine,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"

interface DemoStep {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  detail: string
  value: string
  accent: string
}

const steps: DemoStep[] = [
  {
    id: "deposit",
    icon: ArrowDownToLine,
    label: `Deposit ${MARKET_CONFIG.localCurrency}`,
    detail: "Transfer from your broker to your brokerage",
    value: `${MARKET_CONFIG.localCurrency} 500,000`,
    accent: "text-primary",
  },
  {
    id: "fx",
    icon: ArrowRightLeft,
    label: "FX Conversion",
    detail: "TRM spot rate applied at trade date",
    value: `${MARKET_CONFIG.localCurrency} 4,127.50/${MARKET_CONFIG.baseCurrency}`,
    accent: "text-primary/80",
  },
  {
    id: "net",
    icon: DollarSign,
    label: "Net Buying Power",
    detail: "After fees and FX spread",
    value: `$119.14 ${MARKET_CONFIG.baseCurrency}`,
    accent: "text-primary/70",
  },
  {
    id: "trade",
    icon: ChartLine,
    label: "Execute Trade",
    detail: "Buy US stocks, ETFs, or crypto",
    value: "Buy 1 VOO @ $453.79",
    accent: "text-primary/60",
  },
]

const STEP_DURATION = 3_500

export function LandingDemo() {
  const [activeIndex, setActiveIndex] = useState(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setActiveIndex((prev) => (prev + 1) % steps.length)
      }
    }, STEP_DURATION)
    return () => clearInterval(timer)
  }, [])

  const ActiveIcon = steps[activeIndex].icon

  return (
    <section className="relative border-t border-border/30 bg-surface-container-lowest/50">
      <div className="container mx-auto px-6 py-20 md:py-24">
        <div className="mb-10 max-w-2xl landing-fade-up">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            How it works
          </p>
          <h2
            className={cn(
              "font-sans mt-3 text-3xl tracking-tight text-balance sm:text-4xl md:text-[2.75rem]",
            )}
          >
            From pesos to positions in four steps
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            See how Fintu mirrors your broker flow — every {MARKET_CONFIG.localCurrency} deposit, FX conversion, fee,
            and trade tracked with precision.
          </p>
        </div>

        <div
          className="relative mx-auto max-w-3xl landing-fade-up-delayed"
          onMouseEnter={() => { pausedRef.current = true }}
          onMouseLeave={() => { pausedRef.current = false }}
        >
          {/* Pipeline card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-surface-container/80 shadow-2xl shadow-black/30">
            {/* Header bar */}
            <div className="flex items-center gap-2 border-b border-border/40 bg-surface-container-high/60 px-5 py-3">
              <Building2 className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Broker Flow
              </span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                Live demo
              </span>
            </div>

            {/* Step display */}
            <div className="p-6 md:p-10">
              <div
                key={activeIndex}
                className="flex flex-col items-center gap-6 text-center"
              >
                {/* Animated icon */}
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/40 bg-muted/30 landing-fade-up">
                  <ActiveIcon className={cn("h-9 w-9", steps[activeIndex].accent)} strokeWidth={1.5} />
                </div>

                {/* Step content */}
                <div className="space-y-2 landing-fade-up">
                  <p className="text-sm font-medium text-muted-foreground">
                    Step {activeIndex + 1} of {steps.length}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight">{steps[activeIndex].label}</h3>
                  <p className="text-sm text-muted-foreground">{steps[activeIndex].detail}</p>
                  <p
                    className={cn(
                      "pt-2 font-mono text-3xl font-bold tracking-tight tabular-nums md:text-4xl",
                      steps[activeIndex].accent,
                    )}
                  >
                    {steps[activeIndex].value}
                  </p>
                </div>
              </div>
            </div>

            {/* Pipeline progress bar */}
            <div className="border-t border-border/40 bg-surface-container-low/60 px-5 py-4">
              <div className="flex items-center gap-2">
                {steps.map((step, i) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className="group flex flex-1 flex-col gap-1.5 py-1"
                    aria-label={`Go to step ${i + 1}: ${step.label}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono font-semibold transition-colors",
                          i === activeIndex
                            ? "border-primary bg-primary text-primary-foreground"
                            : i < activeIndex
                              ? "border-primary/40 bg-primary/20 text-primary"
                              : "border-border/60 text-muted-foreground group-hover:border-border",
                        )}
                      >
                        {i < activeIndex ? "✓" : i + 1}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] transition-colors",
                          i === activeIndex ? "text-foreground font-medium" : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {/* Progress bar segment */}
                    <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/50">
                      {i === activeIndex && (
                        <div className="absolute inset-y-0 left-0 rounded-full bg-primary landing-progress-fill" />
                      )}
                      {i < activeIndex && (
                        <div className="absolute inset-y-0 left-0 w-full rounded-full bg-primary/60" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
