import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AuthFloatingCardProps extends HTMLAttributes<HTMLDivElement> {
  variant: "split" | "compact"
  children: ReactNode
  panel?: ReactNode
}

export function AuthFloatingCard({
  variant,
  children,
  panel,
  className,
  ...props
}: AuthFloatingCardProps): React.ReactElement {
  if (variant === "split") {
    return (
      <div
        className={cn(
          "auth-light grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-white text-foreground shadow-2xl",
          "max-h-[min(44rem,calc(100svh-6.5rem))] overflow-y-auto md:grid-cols-2 md:overflow-hidden",
          className,
        )}
        {...props}
      >
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto bg-background p-6 sm:p-7 md:border-r md:border-border">
          {children}
        </div>
        {panel}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "auth-light w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white p-6 text-foreground shadow-2xl sm:p-7",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
