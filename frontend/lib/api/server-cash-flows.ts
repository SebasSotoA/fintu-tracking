import { serverGet } from "./server-client"
import type { PaginatedResult } from "./pagination"
import type { CashFlow } from "@/lib/types"
import type { CashFlowListQueryParams } from "@/lib/cash-flows/cash-flow-filters"
import type { PageSize } from "@/lib/pagination/table-pagination"
import { EXPORT_PAGE_SIZE } from "@/lib/pagination/table-pagination"

export type { CashFlowListQueryParams }

function buildCashFlowsQuery(
  params?: CashFlowListQueryParams & {
    page?: number
    page_size?: PageSize | typeof EXPORT_PAGE_SIZE
  },
): string {
  if (!params) return ""
  const search = new URLSearchParams()
  if (params.page != null) search.set("page", String(params.page))
  if (params.page_size != null) search.set("page_size", String(params.page_size))
  if (params.type) search.set("type", params.type)
  if (params.currency) search.set("currency", params.currency)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  const query = search.toString()
  return query ? `?${query}` : ""
}

/** Legacy: full list without pagination params (plain array response). */
export async function listCashFlows(): Promise<CashFlow[]> {
  return serverGet<CashFlow[]>(`/api/cash-flows`)
}

export async function listCashFlowsPaginated(
  params: CashFlowListQueryParams & {
    page: number
    page_size: PageSize | typeof EXPORT_PAGE_SIZE
  },
): Promise<PaginatedResult<CashFlow>> {
  return serverGet<PaginatedResult<CashFlow>>(`/api/cash-flows${buildCashFlowsQuery(params)}`)
}

export async function listCashFlowsForExport(): Promise<CashFlow[]> {
  const result = await listCashFlowsPaginated({
    page: 1,
    page_size: EXPORT_PAGE_SIZE,
  })
  return result.items
}
