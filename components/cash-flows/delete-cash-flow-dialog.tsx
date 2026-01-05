"use client"

import type { CashFlow } from "@/lib/types"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"

interface DeleteCashFlowDialogProps {
  cashFlow: CashFlow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteCashFlowDialog({ cashFlow, open, onOpenChange, onSuccess }: DeleteCashFlowDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: deleteError } = await supabase.from("cash_flows").delete().eq("id", cashFlow.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsLoading(false)
      return
    }

    onOpenChange(false)
    onSuccess()
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
