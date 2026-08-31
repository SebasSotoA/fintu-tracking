import { cn } from "@/lib/utils"

export const filterTriggerClassName = cn(
  "h-9 font-normal shadow-xs",
  "border border-border bg-background",
  "hover:bg-accent hover:text-accent-foreground hover:border-primary/20",
  "dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
)
