"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  label?: string                 // human-readable label for the View dropdown
  cell: (row: T) => React.ReactNode
  align?: "left" | "right"
  className?: string
  defaultVisible?: boolean       // default true
  toggleable?: boolean           // default true; set false for action columns
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  keyExtractor?: (row: T) => string | number
  rowClassName?: string | ((row: T) => string | undefined)
  emptyState?: React.ReactNode
  className?: string
  renderMobileCard?: (row: T) => React.ReactNode
}

function getCellClassName<T>(column: DataTableColumn<T>): string {
  return cn(
    column.align === "right" && "text-right",
    "whitespace-nowrap",
    column.className,
  )
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  rowClassName,
  emptyState,
  className,
  renderMobileCard,
}: DataTableProps<T>) {
  const hasMobileCards = typeof renderMobileCard === "function"

  if (data.length === 0 && emptyState) {
    return emptyState
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        data-testid="data-table-table"
        className={cn("w-full overflow-x-auto", hasMobileCards && "hidden md:block")}
      >
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={getCellClassName(column)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => {
              const derivedRowClassName =
                typeof rowClassName === "function" ? rowClassName(row) : rowClassName
              return (
                <TableRow
                  key={keyExtractor ? keyExtractor(row) : rowIndex}
                  className={derivedRowClassName}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={`${rowIndex}-${column.key}`}
                      className={getCellClassName(column)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {hasMobileCards && (
        <div data-testid="data-table-cards" className="md:hidden space-y-3">
          {data.map((row, rowIndex) => (
            <div key={keyExtractor ? keyExtractor(row) : rowIndex}>
              {renderMobileCard!(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
