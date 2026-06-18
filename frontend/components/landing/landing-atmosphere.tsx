import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface LandingAtmosphereProps {
  children: ReactNode
  className?: string
}

export function LandingAtmosphere({ children, className }: LandingAtmosphereProps) {
  return (
    <div className={cn("relative isolate min-h-screen overflow-x-hidden bg-background", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[520px] w-[min(90vw,720px)] opacity-60 landing-glow"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 65% 40%, color-mix(in oklch, var(--primary) 22%, transparent) 0%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 opacity-30 landing-glow-reverse"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in oklch, var(--primary-container) 55%, transparent) 0%, transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
      />
      {children}
    </div>
  )
}
