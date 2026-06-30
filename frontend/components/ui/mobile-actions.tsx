import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface MobileAction {
  label: string
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  destructive?: boolean
}

interface MobileActionsProps {
  actions: MobileAction[]
  className?: string
}

export function MobileActions({ actions, className }: MobileActionsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "min-h-11 min-w-11 md:min-h-9 md:min-w-9",
            action.destructive && "text-destructive hover:text-destructive hover:bg-destructive/10",
          )}
          aria-label={action.label}
          onClick={action.onClick}
        >
          <action.icon className="size-5 md:size-4" />
        </Button>
      ))}
    </div>
  )
}
