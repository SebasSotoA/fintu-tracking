"use client"

import type { Trade } from "@/lib/types"
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
import { deleteTrade } from "@/lib/api/trades"
import { showToast } from "@/lib/toast"
import { useLocale } from "@/components/locale-provider"

interface DeleteTradeDialogProps {
  trade: Trade
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteTradeDialog({ trade, open, onOpenChange, onSuccess }: DeleteTradeDialogProps) {
  const { t } = useLocale()
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      await deleteTrade(trade.id)
      showToast.success(t("trades.deleted"))
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("trades.deleteFailed"),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("trades.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("trades.deleteDescription", { ticker: trade.ticker })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto">
            {t("trades.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? t("trades.deleting") : t("trades.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
