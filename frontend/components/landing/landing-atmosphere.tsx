import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface LandingAtmosphereProps {
  children: ReactNode
  className?: string
}

export function LandingAtmosphere({ children, className }: LandingAtmosphereProps) {
  return (
    <div className={cn("relative isolate min-h-dvh bg-background", className)}>
      <div
        data-landing-decoration
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -top-32 right-0 h-[520px] w-[min(90vw,720px)] opacity-60 landing-glow will-change-[opacity]"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 65% 40%, var(--landing-glow-mint) 0%, transparent 72%)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-24 h-96 w-96 opacity-35 landing-glow-reverse will-change-[opacity]"
          style={{
            background:
              "radial-gradient(circle at center, var(--landing-glow-teal) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      {children}
    </div>
  )
}
