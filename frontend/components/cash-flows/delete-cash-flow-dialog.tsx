"use client"

import type { CashFlow } from "@/lib/types"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteCashFlow } from "@/lib/api/cash-flows"
import { showToast } from "@/lib/toast"
import { useLocale } from "@/components/locale-provider"
import { getCashFlowTypeLabel } from "@/lib/cash-flows/cash-flows-list-display"

interface DeleteCashFlowDialogProps {
  cashFlow: CashFlow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteCashFlowDialog({ cashFlow, open, onOpenChange, onSuccess }: DeleteCashFlowDialogProps) {
  const { t } = useLocale()
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      await deleteCashFlow(cashFlow.id)
      showToast.success(t("cash.deleted"))
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("cash.deleteFailed"),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cash.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("cash.deleteDescription", { type: getCashFlowTypeLabel(cashFlow.type, t).toLowerCase() })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto">
            {t("cash.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? t("cash.deleting") : t("cash.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
