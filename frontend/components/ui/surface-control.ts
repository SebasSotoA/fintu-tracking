import { cn } from "@/lib/utils"

export const surfaceControlClassName = cn(
  "border border-border bg-card shadow-sm",
  "hover:bg-accent hover:text-accent-foreground hover:border-primary/20",
  "dark:bg-white/[0.08] dark:border-white/15 dark:hover:bg-white/[0.12]",
)
