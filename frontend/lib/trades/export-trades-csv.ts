import type { Trade } from "@/lib/types"

const CSV_HEADERS = ["date", "ticker", "side", "quantity", "price", "fees", "total"] as const

export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function tradeFees(trade: Trade): string {
  return trade.total_fees || "0"
}

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map((trade) =>
    [
      trade.date.slice(0, 10),
      trade.ticker,
      trade.side,
      trade.quantity,
      trade.price,
      tradeFees(trade),
      trade.total,
    ]
      .map((cell) => escapeCsvField(String(cell)))
      .join(","),
  )
  return [CSV_HEADERS.join(","), ...rows].join("\n")
}

export function downloadTradesCsv(trades: Trade[], filename = "trades.csv") {
  const csv = tradesToCsv(trades)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
