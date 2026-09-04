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
import { useLocale } from "@/components/locale-provider"
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
  showingText?: string
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  showingText,
}: TablePaginationProps) {
  const { t } = useLocale()
  const pages = totalPages(total, pageSize)
  const atFirst = page <= 1
  const atLast = page >= pages
  const rowsPerPageLabel = t("table.rowsPerPage")

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Label
          htmlFor="table-page-size"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {rowsPerPageLabel}
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value) as PageSize)}
        >
          <SelectTrigger id="table-page-size" className="h-8 w-[4.5rem]" aria-label={rowsPerPageLabel}>
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
        {showingText ?? t("table.pageOf", { page, pages })}
      </p>

      <div className="flex items-center justify-center gap-1 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11 text-foreground md:size-8"
          aria-label={t("table.firstPage")}
          disabled={atFirst}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11 text-foreground md:size-8"
          aria-label={t("table.previousPage")}
          disabled={atFirst}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11 text-foreground md:size-8"
          aria-label={t("table.nextPage")}
          disabled={atLast}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11 text-foreground md:size-8"
          aria-label={t("table.lastPage")}
          disabled={atLast}
          onClick={() => onPageChange(pages)}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
