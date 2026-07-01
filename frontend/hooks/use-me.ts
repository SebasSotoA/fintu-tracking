"use client"

import { useQuery } from "@tanstack/react-query"
import { getMe, type Profile } from "@/lib/api/me"
import { queryKeys } from "@/lib/api/query-keys"

export function useMe(initialData?: Profile) {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
    initialData,
  })
}
