import { getHoldings } from "@/lib/api/server-portfolio"
import { HoldingsTable } from "@/components/dashboard/holdings-table"

export async function HoldingsTableServer() {
  const holdings = await getHoldings().catch(() => [])
  return <HoldingsTable holdings={holdings} />
}
