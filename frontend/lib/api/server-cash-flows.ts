import { serverGet } from "./server-client"
import type { CashFlow } from "@/lib/types"

export async function listCashFlows(): Promise<CashFlow[]> {
  return serverGet<CashFlow[]>("/api/cash-flows")
}

