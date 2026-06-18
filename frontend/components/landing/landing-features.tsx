import { BarChart3, DollarSign, PieChart, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { landingDisplay } from "@/lib/fonts/landing-display"

const features = [
  {
    id: "multi-currency",
    title: "Multi-Currency",
    description:
      "Track COP to USD conversions with historical FX rates applied at each trade date—not today's spot rate.",
    icon: TrendingUp,
    className: "md:col-span-2 md:row-span-2",
    accent: "from-primary/12 via-primary/5 to-transparent",
  },
  {
    id: "cost-basis",
    title: "Accurate Cost Basis",
    description: "Average cost method with every fee rolled into your true entry price.",
    icon: DollarSign,
    className: "md:col-span-1",
    accent: "from-primary/10 to-transparent",
  },
  {
    id: "portfolio",
    title: "Portfolio View",
    description: "Holdings, allocation, and P/L in both currencies—side by side.",
    icon: PieChart,
    className: "md:col-span-1",
    accent: "from-primary/8 to-transparent",
  },
  {
    id: "performance",
    title: "Performance",
    description:
      "XIRR and fee-impact analysis that reflect how your capital actually compounded over time.",
    icon: BarChart3,
    className: "md:col-span-2",
    accent: "from-primary/10 via-primary/5 to-transparent",
  },
] as const

export function LandingFeatures() {
  return (
    <section id="features" className="relative border-t border-border/30 bg-surface-container-lowest/50">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="mb-12 max-w-2xl md:mb-16 landing-fade-up">
          <p className="font-mono text-xs tracking-widest text-primary uppercase">Capabilities</p>
          <h2
            className={cn(
              landingDisplay.className,
              "mt-3 text-3xl tracking-tight text-balance sm:text-4xl md:text-[2.75rem]",
            )}
          >
            Every pillar of precision tracking
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            From FX reconciliation to performance math—Fintu is built around the numbers LATAM
            investors actually need.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2 md:gap-5">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.id}
                variant="interactive"
                className={cn(
                  "group relative overflow-hidden border-border/50 bg-surface-container/60 py-0 landing-fade-up-stagger",
                  feature.className,
                )}
                style={{ animationDelay: `${100 + index * 70}ms` }}
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-500 group-hover:opacity-100",
                    feature.accent,
                  )}
                />
                <CardContent className="relative flex h-full flex-col justify-between gap-6 p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 transition-colors duration-300 group-hover:border-primary/35 group-hover:bg-primary/15">
                      <Icon className="size-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground/70 uppercase">
                      0{index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className={cn(landingDisplay.className, "text-2xl tracking-tight")}>
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
