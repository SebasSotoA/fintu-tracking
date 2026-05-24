'use client'

import { Toaster as Sonner } from 'sonner'

const Toaster = () => (
  <Sonner
    theme="dark"
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

export { Toaster }
