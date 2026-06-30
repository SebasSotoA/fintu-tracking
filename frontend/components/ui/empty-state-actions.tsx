import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateActionsProps {
  children: React.ReactNode
  className?: string
}

export function EmptyStateActions({ children, className }: EmptyStateActionsProps) {
  return (
    <div className={cn("flex flex-col gap-3 w-full md:w-auto", className)}>
      {children}
    </div>
  )
}

interface EmptyStateActionProps {
  children: React.ReactNode
  className?: string
}

export function EmptyStateAction({ children, className }: EmptyStateActionProps) {
  return <span className={cn("w-full md:w-auto", className)}>{children}</span>
}
