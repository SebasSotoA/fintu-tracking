"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { useLocale } from "@/components/locale-provider"

export function PerformanceEmptyState() {
  const { t } = useLocale()
  return (
    <EmptyState
      title={t("performance.emptyTitle")}
      description={t("performance.emptyDescription")}
      action={
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <AddTradeDialog>
            <span className="w-full md:w-auto">{t("performance.addTrade")}</span>
          </AddTradeDialog>
        </div>
      }
    />
  )
}
