"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
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
  sortable?: boolean             // default false
  sortKey?: string               // API sort field when it differs from `key`
}

export interface DataTableSort {
  key: string
  dir: "asc" | "desc"
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  keyExtractor?: (row: T) => string | number
  rowClassName?: string | ((row: T) => string | undefined)
  emptyState?: React.ReactNode
  className?: string
  renderMobileCard?: (row: T) => React.ReactNode
  sort?: DataTableSort
  /**
   * Called with the column's `sortKey` (or `key`). Parents should:
   * click a different column → that column, dir `desc`;
   * click the active column → flip `asc`/`desc`.
   * Clicking sort should also reset page to 1.
   */
  onSort?: (sortKey: string) => void
}

function getCellClassName<T>(column: DataTableColumn<T>): string {
  return cn(
    column.align === "right" && "text-right",
    "whitespace-nowrap",
    column.className,
  )
}

function columnSortKey<T>(column: DataTableColumn<T>): string {
  return column.sortKey ?? column.key
}

function columnAriaSort<T>(
  column: DataTableColumn<T>,
  sort: DataTableSort | undefined,
): "ascending" | "descending" | "none" | undefined {
  if (!column.sortable) return undefined
  if (!sort || sort.key !== columnSortKey(column)) return "none"
  return sort.dir === "asc" ? "ascending" : "descending"
}

function SortChevron({
  active,
  dir,
}: {
  active: boolean
  dir: "asc" | "desc" | undefined
}): React.ReactElement {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  rowClassName,
  emptyState,
  className,
  renderMobileCard,
  sort,
  onSort,
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
              {columns.map((column) => {
                const sortKey = columnSortKey(column)
                const isActive = Boolean(sort && sort.key === sortKey)
                return (
                  <TableHead
                    key={column.key}
                    className={getCellClassName(column)}
                    aria-sort={columnAriaSort(column, sort)}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex w-full cursor-pointer items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          column.align === "right" && "flex-row-reverse",
                        )}
                        onClick={() => onSort?.(sortKey)}
                      >
                        {column.header}
                        <SortChevron active={isActive} dir={sort?.dir} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
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
          {data.map((row, rowIndex) => {
            const derivedRowClassName =
              typeof rowClassName === "function" ? rowClassName(row) : rowClassName
            return (
              <div key={keyExtractor ? keyExtractor(row) : rowIndex} className={derivedRowClassName}>
                {renderMobileCard!(row)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
