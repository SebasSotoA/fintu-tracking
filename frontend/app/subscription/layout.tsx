import type React from "react"
import { AppShell } from "@/components/layout/app-shell"

export default async function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
