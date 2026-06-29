"use client"

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { getMe, updateOnboarding, type UpdateOnboardingData } from "@/lib/api/me"
import { createBroker } from "@/lib/api/brokers"
import { queryKeys } from "@/lib/api/query-keys"

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateOnboardingData) => {
      await createBroker({ preset_id: data.broker_preset_id })
      return updateOnboarding(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.brokers() })
    },
  })
}
