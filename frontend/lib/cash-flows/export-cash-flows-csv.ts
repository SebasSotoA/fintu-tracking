import type { CashFlow } from "@/lib/types"
import { escapeCsvField } from "@/lib/trades/export-trades-csv"

const CSV_HEADERS = [
  "date",
  "type",
  "fee_type",
  "currency",
  "amount",
  "usd_amount",
  "fx_rate",
  "notes",
] as const

function cell(value: string | null | undefined): string {
  if (value == null || value === "") {
    return ""
  }
  return escapeCsvField(String(value))
}

export function cashFlowsToCsv(cashFlows: CashFlow[]): string {
  const rows = cashFlows.map((cf) =>
    [
      cf.date.slice(0, 10),
      cf.type,
      cf.fee_type ?? "",
      cf.currency,
      cf.amount,
      cf.usd_amount,
      cf.fx_rate ?? "",
      cf.notes ?? "",
    ]
      .map((value) => cell(value))
      .join(","),
  )
  return [CSV_HEADERS.join(","), ...rows].join("\n")
}

export function downloadCashFlowsCsv(cashFlows: CashFlow[], filename = "cash-flows.csv") {
  const csv = cashFlowsToCsv(cashFlows)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
