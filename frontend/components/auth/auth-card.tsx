import type { ReactNode } from "react"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FintuLogo } from "@/components/brand/fintu-logo"
import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function AuthCard({ title, description, children, footer, className }: AuthCardProps): React.ReactElement {
  return (
    <Card className={cn("w-full border-border/50 bg-card/80 shadow-xl backdrop-blur-sm", className)}>
      <CardHeader className="space-y-3 pb-2 text-center">
        <Link href="/" className="mx-auto inline-block">
          <FintuLogo className="h-8 w-auto" />
          <span className="sr-only">Fintu</span>
        </Link>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {footer && (
          <div className="pt-2 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
