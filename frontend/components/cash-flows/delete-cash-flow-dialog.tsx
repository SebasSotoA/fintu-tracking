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

interface DeleteCashFlowDialogProps {
  cashFlow: CashFlow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteCashFlowDialog({ cashFlow, open, onOpenChange, onSuccess }: DeleteCashFlowDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      await deleteCashFlow(cashFlow.id)
      showToast.success("Cash flow deleted")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : "Failed to delete cash flow",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Cash Flow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {cashFlow.type}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
