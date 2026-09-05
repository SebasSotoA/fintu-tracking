import Link from "next/link"

import { FintuLogo } from "@/components/brand/fintu-logo"
import { cn } from "@/lib/utils"

interface AuthFormHeaderProps {
  title: string
  description: string
  size: "split" | "compact"
}

export function AuthFormHeader({
  title,
  description,
  size,
}: AuthFormHeaderProps): React.ReactElement {
  return (
    <div className="flex flex-col items-start gap-1 text-left">
      <Link
        href="/"
        className="inline-block hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FintuLogo className={size === "split" ? "h-10 w-auto" : "h-8 w-auto"} />
        <span className="sr-only">Fintu</span>
      </Link>
      <div className="space-y-1">
        <h1
          className={cn(
            "font-semibold leading-snug tracking-tight text-foreground",
            size === "split" ? "!text-4xl" : "!text-2xl",
          )}
        >
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
