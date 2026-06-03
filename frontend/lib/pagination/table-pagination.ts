export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export const DEFAULT_PAGE_SIZE: PageSize = 10
export const EXPORT_PAGE_SIZE = 10000

export interface PageParams {
  page: number
  pageSize: PageSize
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1
  return Math.max(1, Math.ceil(total / pageSize))
}

export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), totalPages(total, pageSize))
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

export function parsePageSize(value: string | undefined): PageSize {
  const n = parsePositiveInt(value, DEFAULT_PAGE_SIZE)
  if (PAGE_SIZE_OPTIONS.includes(n as PageSize)) {
    return n as PageSize
  }
  return DEFAULT_PAGE_SIZE
}

export function parsePageParams(
  params: Record<string, string | string[] | undefined>,
): PageParams {
  const pageRaw = Array.isArray(params.page) ? params.page[0] : params.page
  const pageSizeRaw = Array.isArray(params.page_size)
    ? params.page_size[0]
    : params.page_size

  return {
    page: parsePositiveInt(pageRaw, 1),
    pageSize: parsePageSize(pageSizeRaw),
  }
}

export function mergePageSearchParams(
  base: URLSearchParams,
  page: number,
  pageSize: PageSize,
): URLSearchParams {
  const params = new URLSearchParams(base.toString())
  params.set("page", String(page))
  params.set("page_size", String(pageSize))
  return params
}
