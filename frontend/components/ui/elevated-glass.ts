import { cn } from "@/lib/utils"

export type ElevatedSurface = "glass" | "opaque" | "frost"

const glassSheenClass = cn(
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
  "before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:content-['']",
)

/** Frosted elevated surface for dialogs, drawers, and alert dialogs. */
export const elevatedGlassClass = cn(
  "relative border-white/10 bg-gradient-to-b from-white/[0.07] to-card/90 text-card-foreground",
  "backdrop-blur-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.38)]",
  glassSheenClass,
)

/** Solid page-background fill — no glass, no backdrop bleed. */
export const opaqueSurfaceClass = cn(
  "relative bg-background text-foreground border-border",
  "shadow-[0_12px_32px_rgba(0,0,0,0.38)]",
)

/** Page-background frost: same fill as the settings rail, with a light glass blur. */
export const frostedSurfaceClass = cn(
  "relative border-white/10 bg-background/88 text-foreground",
  "backdrop-blur-[16px] shadow-[0_12px_32px_rgba(0,0,0,0.38)]",
  glassSheenClass,
)

export function elevatedSurfaceClass(surface: ElevatedSurface = "glass"): string {
  if (surface === "opaque") return opaqueSurfaceClass
  if (surface === "frost") return frostedSurfaceClass
  return elevatedGlassClass
}
