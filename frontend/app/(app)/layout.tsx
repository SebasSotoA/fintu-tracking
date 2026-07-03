import type React from "react"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>
}
