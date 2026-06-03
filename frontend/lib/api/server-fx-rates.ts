import { serverGet } from "./server-client"
import type { FxRate } from "@/lib/types"
import type { FxRateChartPoint } from "@/lib/api/fx-rates"

/** Legacy: full FX rate history (avoid on page navigation; prefer getFxRateChart). */
export async function listFxRates(): Promise<FxRate[]> {
  return serverGet<FxRate[]>("/api/fx-rates")
}

export async function getFxRateChart(days = 90): Promise<FxRateChartPoint[]> {
  return serverGet<FxRateChartPoint[]>(`/api/fx-rates/chart?days=${days}`)
}
