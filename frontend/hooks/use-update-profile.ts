"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateProfile, type UpdateProfileData } from "@/lib/api/me"
import { queryKeys } from "@/lib/api/query-keys"

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileData) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.brokers() })
    },
  })
}
