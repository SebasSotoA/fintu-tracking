import Link from "next/link"

import { FintuLogo } from "@/components/brand/fintu-logo"

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
  if (size === "split") {
    return (
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="!text-4xl font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1 text-left">
      <Link
        href="/"
        className="inline-block hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FintuLogo className="h-8 w-auto" />
        <span className="sr-only">Fintu</span>
      </Link>
      <div className="space-y-1">
        <h1 className="!text-2xl font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
