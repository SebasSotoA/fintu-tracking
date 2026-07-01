"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"

export function DashboardEmptyState() {
  return (
    <EmptyState
      title="Aún no hay datos en tu portafolio"
      description="Agrega tu primera operación o importa tu historial para empezar a hacer seguimiento."
      action={
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <AddTradeDialog>
            <span className="w-full md:w-auto">Agregar operación</span>
          </AddTradeDialog>
        </div>
      }
    />
  )
}
