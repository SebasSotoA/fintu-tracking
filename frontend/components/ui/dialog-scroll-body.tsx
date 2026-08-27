import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DialogScrollBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "scrollbar-minimal min-h-0 flex-1 overflow-y-auto px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  )
}
