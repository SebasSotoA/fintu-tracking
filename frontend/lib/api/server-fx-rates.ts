import { serverGet } from "./server-client"
import type { FxRate } from "@/lib/types"

export async function listFxRates(): Promise<FxRate[]> {
  return serverGet<FxRate[]>("/api/fx-rates")
}

