"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/hooks/use-count-up"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"

interface Stat {
  label: string
  value: number
  suffix: string
  description: string
}

const stats: Stat[] = [
  {
    label: "FX Precision",
    value: 100,
    suffix: "%",
    description: `Every ${MARKET_CONFIG.localCurrency} deposit reconciled at the trade-date FX rate`,
  },
  {
    label: "Fee Tracking",
    value: 4,
    suffix: "",
    description: "Fee categories mapped—deposit, transfer, trading, and closing",
  },
  {
    label: "XIRR Accuracy",
    value: 100,
    suffix: "%",
    description: "Time-weighted returns accounting for every cash flow",
  },
  {
    label: "Asset Coverage",
    value: 3,
    suffix: "",
    description: "US stocks, ETFs, and crypto — all in one portfolio",
  },
]

function StatItem({ stat, isActive }: { stat: Stat; isActive: boolean }) {
  const count = useCountUp(stat.value, isActive)

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center md:py-8">
      <p className="font-mono text-4xl font-bold tracking-tight tabular-nums text-primary md:text-5xl">
        {count}
        <span className="text-2xl md:text-3xl">{stat.suffix}</span>
      </p>
      <p className="text-sm font-medium text-foreground">{stat.label}</p>
      <p className="max-w-[16ch] text-xs text-muted-foreground">{stat.description}</p>
    </div>
  )
}

export function LandingSocialProof() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative border-t border-border/30 bg-surface-container-lowest">
      <div className="container mx-auto px-6 py-16 md:py-20">
        <div className="mb-10 text-center landing-fade-up">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">
            Built for precision
          </p>
          <h2
            className={cn(
              "font-sans mt-3 text-3xl tracking-tight text-balance sm:text-4xl",
            )}
          >
            Every number accounted for
          </h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="landing-fade-up-stagger"
              style={{ animationDelay: `${200 + index * 80}ms` }}
            >
              <StatItem stat={stat} isActive={isVisible} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
