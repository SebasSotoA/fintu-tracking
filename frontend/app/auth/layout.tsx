import type { ReactElement, ReactNode } from "react"
import { AuthLanguageSwitch } from "./auth-language-switch"

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps): ReactElement {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <AuthLanguageSwitch />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl"
      />
      <div className="relative z-10 w-full max-w-[420px]">{children}</div>
    </div>
  )
}
