'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

const Toaster = () => {
  const { theme = 'dark' } = useTheme()

  return (
    <Sonner
      theme={theme as 'light' | 'dark' | 'system'}
      position="top-right"
      gap={8}
      offset={16}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            'bg-surface-container-high border border-border rounded-lg shadow-lg text-foreground text-sm gap-3',
          title: 'text-sm font-medium',
          description: 'text-sm text-muted-foreground',
        },
      }}
    />
  )
}

export { Toaster }
