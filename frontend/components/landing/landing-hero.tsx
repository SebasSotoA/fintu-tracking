import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { landingDisplay } from "@/lib/fonts/landing-display"

const precisionMetrics = [
  { label: "COP → USD", value: "4,127.50", delta: "TRM spot" },
  { label: "XIRR", value: "+12.4%", delta: "annualized" },
  { label: "Net worth", value: "$48,291", delta: "USD basis" },
] as const

export function LandingHero() {
  return (
    <section id="about" className="relative container mx-auto px-6 pb-20 pt-14 md:pb-28 md:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="max-w-xl landing-fade-up">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            Built for LATAM retail investors
          </p>
          <h1
            className={cn(
              landingDisplay.className,
              "text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-[3.5rem]",
            )}
          >
            Track your USD investments
            <span className="mt-1 block text-primary">with precision</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
            Fintu accounts for COP↔USD FX, fees, and cost basis so you see real performance—not
            guesswork—across every holding.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/auth/sign-up">
                Get Started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border/40 pt-8">
            {[
              { term: "FX", desc: "Historical COP rates" },
              { term: "Fees", desc: "Included in basis" },
              { term: "XIRR", desc: "True returns" },
            ].map((item) => (
              <div key={item.term}>
                <dt className="font-mono text-sm font-medium text-primary">{item.term}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto lg:max-w-none landing-fade-up-delayed">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-3xl border border-primary/15 bg-primary/10"
          />
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-container/80 shadow-2xl shadow-black/40 landing-float">
            <div className="flex items-center justify-between border-b border-border/50 bg-surface-container-high/80 px-4 py-3">
              <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                Precision snapshot
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                Live mock
              </span>
            </div>
            <div className="space-y-0 divide-y divide-border/40 p-1">
              {precisionMetrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className="flex items-baseline justify-between gap-4 px-4 py-4 landing-fade-up-metric"
                  style={{ animationDelay: `${180 + index * 80}ms` }}
                >
                  <div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 font-mono text-2xl font-medium tracking-tight text-foreground">
                      {metric.value}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] tracking-wide text-primary/80 uppercase">
                    {metric.delta}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 bg-surface-container-low/60 px-4 py-3">
              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                Fees · FX · cost basis reconciled · performance in USD & COP
              </p>
            </div>
          </div>
          <div
            aria-hidden
            className="absolute -right-3 -bottom-3 hidden h-24 w-24 rounded-xl border border-primary/20 bg-primary/10 md:block landing-float-slow"
          />
        </div>
      </div>
    </section>
  )
}
