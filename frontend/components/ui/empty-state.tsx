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
        "flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl",
        className,
      )}
    >
      <p className="text-muted-foreground mb-2">{title}</p>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action}
    </div>
  )
}
