import type { ReactElement, ReactNode } from "react"
import { AuthAuroraBackdrop } from "@/components/auth/auth-aurora-backdrop"
import { AuthLanguageSwitch } from "./auth-language-switch"
import "./auth-shell.css"

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps): ReactElement {
  return (
    <main className="auth-shell relative h-svh max-h-svh w-full overflow-hidden overscroll-none">
      <AuthAuroraBackdrop />
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-3 pt-2 sm:px-6 sm:pb-4">
        <AuthLanguageSwitch />
        <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto py-2">
          {children}
        </div>
      </div>
    </main>
  )
}
