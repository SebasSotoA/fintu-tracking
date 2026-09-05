import type { ReactNode } from "react"

import { AuthFloatingCard } from "@/components/auth/auth-floating-card"
import { AuthFormHeader } from "@/components/auth/auth-form-header"

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps): React.ReactElement {
  return (
    <AuthFloatingCard variant="compact" className={className}>
      <div className="flex flex-col gap-6">
        <AuthFormHeader title={title} description={description} size="compact" />
        {children}
        {footer ? (
          <div className="pt-2 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </AuthFloatingCard>
  )
}
