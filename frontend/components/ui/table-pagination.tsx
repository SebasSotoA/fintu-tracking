"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
  totalPages,
} from "@/lib/pagination/table-pagination"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface TablePaginationProps {
  page: number
  pageSize: PageSize
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: PageSize) => void
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const pages = totalPages(total, pageSize)
  const atFirst = page <= 1
  const atLast = page >= pages

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Label
          htmlFor="table-page-size"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Rows per page
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value) as PageSize)}
        >
          <SelectTrigger id="table-page-size" className="h-8 w-[4.5rem]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:flex-1">
        Page {page} of {pages}
      </p>

      <div className="flex items-center justify-center gap-1 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="First page"
          disabled={atFirst}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Previous page"
          disabled={atFirst}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Next page"
          disabled={atLast}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Last page"
          disabled={atLast}
          onClick={() => onPageChange(pages)}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
