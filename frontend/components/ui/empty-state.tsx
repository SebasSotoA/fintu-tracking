import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-8 text-center border border-dashed rounded-xl md:px-6 md:py-10",
        className,
      )}
    >
      <p className="text-muted-foreground mb-1 text-sm md:text-base font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action && (
        <div className="w-full md:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}
