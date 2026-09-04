'use client'

import type { ComponentProps } from 'react'
import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'

function Spinner({ className, ...props }: ComponentProps<'svg'>) {
  const { t } = useLocale()

  return (
    <Loader2Icon
      role="status"
      aria-label={t("table.loading")}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
