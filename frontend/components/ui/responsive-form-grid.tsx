import * as React from "react"
import { cn } from "@/lib/utils"

export function ResponsiveFormGrid({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-testid="responsive-form-grid"
      className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}
