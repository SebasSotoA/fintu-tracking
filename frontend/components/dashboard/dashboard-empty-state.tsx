"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { useLocale } from "@/components/locale-provider"

export function DashboardEmptyState() {
  const { t } = useLocale()
  return (
    <EmptyState
      title={t("dashboard.emptyTitle")}
      description={t("dashboard.emptyDescription")}
      action={
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <AddTradeDialog>
            <span className="w-full md:w-auto">{t("dashboard.addTrade")}</span>
          </AddTradeDialog>
        </div>
      }
    />
  )
}
