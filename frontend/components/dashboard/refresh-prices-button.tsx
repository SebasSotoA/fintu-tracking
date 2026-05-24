"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { refreshMarketPrices } from "@/lib/api/portfolio"
import { showToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface RefreshPricesButtonProps {
  className?: string
  align?: "start" | "end"
}

export function RefreshPricesButton({
  className,
  align = "end",
}: RefreshPricesButtonProps) {
  const router = useRouter()

  const refreshMutation = useMutation({
    mutationFn: refreshMarketPrices,
    onMutate: () => showToast.loading("Refreshing prices…"),
    onSuccess: (result, _vars, toastId) => {
      if (toastId !== undefined) showToast.dismiss(toastId)
      if (result.errors.length > 0 && result.updated === 0) {
        showToast.error(result.errors.join("; "))
        return
      }
      const parts = [`Updated ${result.updated} ticker${result.updated === 1 ? "" : "s"}`]
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} failed`)
      }
      showToast.success(parts.join(" · "))
      router.refresh()
    },
    onError: (err: Error, _vars, toastId) => {
      if (toastId !== undefined) showToast.dismiss(toastId)
      showToast.error(err.message || "Failed to refresh prices")
    },
  })

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        align === "end" ? "items-end" : "items-start",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={refreshMutation.isPending}
        onClick={() => refreshMutation.mutate()}
      >
        {refreshMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Refresh Prices
      </Button>
    </div>
  )
}
