# Component Patterns

React component architecture for **fintu-tracking**: plain function components, shadcn/ui, Tailwind 4, feature-colocated folders.

---

## Plain Function Components (NOT React.FC)

```tsx
interface HoldingsTableProps {
  holdings: Holding[]
  className?: string
}

export function HoldingsTable({ holdings, className }: HoldingsTableProps) {
  return (
    <div className={cn("rounded-lg border", className)}>
      {/* table content */}
    </div>
  )
}
```

- Props interface suffixed with `Props`
- Named exports are common for feature components; default export also acceptable
- No `React.FC`

---

## Folder Structure (Feature-Colocated)

| Location | Purpose | Examples |
|----------|---------|----------|
| `components/ui/` | shadcn/ui primitives | `button`, `dialog`, `table`, `form` |
| `components/layout/` | App chrome | `app-nav`, `landing-nav` |
| `components/dashboard/` | Dashboard widgets | `holdings-table`, `portfolio-summary` |
| `components/trades/` | Trade management | `trades-list`, `add-trade-dialog` |
| `components/cash-flows/` | Cash flow UI | `cash-flows-list`, `fx-rate-manager` |
| `components/performance/` | Performance views | `performance-charts`, `performance-metrics` |
| `components/analytics/` | Analytics charts | `fee-attribution-chart` |

No Atomic Design mandate — group by feature domain.

---

## "use client" Boundary

- **Server component (default)**: layouts, static shells, data that can fetch on server
- **Client component**: hooks, event handlers, TanStack Query, browser APIs

Add `"use client"` as the first line only when required.

---

## shadcn/ui + Tailwind

```tsx
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

<Button variant="outline" size="sm">Cancel</Button>
<div className="flex flex-col gap-4 p-6">
```

Use Tailwind spacing scale (`p-4`, `gap-2`). Arbitrary values OK for specific dimensions (`w-[320px]`).

---

## App Router Loading / Error

Route segments use co-located files:

```
app/(app)/trades/
├── page.tsx
├── loading.tsx    # Skeleton while page loads
└── error.tsx      # Route error boundary (optional)
```

Example `loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

Client components with `useQuery` may show inline loading states (`isLoading`) when no Suspense boundary wraps them.

---

## Component Structure Template

```tsx
"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { cn } from "@/lib/utils"

interface TradesListProps {
  className?: string
}

export function TradesList({ className }: TradesListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trades"],
    queryFn: () => apiClient.get<Trade[]>("/trades"),
  })

  if (isLoading) return <div className="p-6">Loading trades…</div>
  if (error) return <div className="p-6 text-destructive">Failed to load trades</div>
  if (!data?.length) return <div className="p-6 text-muted-foreground">No trades yet</div>

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* render trades */}
    </div>
  )
}
```

---

## Forms

Always: `useForm` + `zodResolver` + shadcn Form components. Reset on dialog close.

---

## Performance

Profile before adding `useMemo`/`useCallback`. React 19 compiler reduces need for manual memoization.

---

## Checklist

- Plain functions, typed props
- Feature folder placement
- shadcn/ui + Tailwind, `cn()` for conditional classes
- sonner for feedback
- ApiClient for backend calls
- Colocated Vitest tests
