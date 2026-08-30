import type { ReactElement, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  heading: string
  isFirst?: boolean
  children: ReactNode
}

export function SettingsSection({
  heading,
  isFirst = false,
  children,
}: SettingsSectionProps): ReactElement {
  return (
    <section>
      <h3
        className={cn(
          "mb-2 px-1 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground",
          !isFirst && "mt-6",
        )}
      >
        {heading}
      </h3>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/50">
        {children}
      </div>
    </section>
  )
}
