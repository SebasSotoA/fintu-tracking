import { serverGet } from "./server-client"
import type { Trade } from "@/lib/types"

export async function listTrades(): Promise<Trade[]> {
  return serverGet<Trade[]>("/api/trades")
}

