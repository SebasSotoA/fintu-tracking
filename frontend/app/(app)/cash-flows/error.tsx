"use client"

import { AppRouteError } from "@/components/app-route-error"
import { useLocale } from "@/components/locale-provider"

export default function CashFlowsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()
  return <AppRouteError error={error} reset={reset} title={t("errors.cashFlowsUnavailable")} />
}
