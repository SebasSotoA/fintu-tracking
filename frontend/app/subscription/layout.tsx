import type React from "react"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout requireActiveSubscription={false}>{children}</ProtectedLayout>
}
