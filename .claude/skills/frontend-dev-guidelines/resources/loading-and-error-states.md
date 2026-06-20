# Loading & Error States

Loading, error, and empty states in **fintu-tracking** using Next.js App Router conventions.

---

## Route-Level Loading (`loading.tsx`)

Place `loading.tsx` next to `page.tsx` in the same route segment:

```
app/(app)/trades/
├── page.tsx
└── loading.tsx
```

Next.js automatically wraps the page in Suspense and shows `loading.tsx` while the page loads.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
```

Existing examples: `dashboard/loading.tsx`, `trades/loading.tsx`, `cash-flows/loading.tsx`, `performance/loading.tsx`.

---

## Route-Level Errors (`error.tsx`)

Optional client component for route errors:

```tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## Client Component Loading (useQuery)

When using `useQuery` without Suspense, handle loading inline:

```tsx
const { data, isLoading, error } = useQuery({ ... })

if (isLoading) return <Skeleton className="h-64 w-full" />
if (error) return <p className="text-destructive">Failed to load data</p>
if (!data?.length) return <EmptyState title="No trades yet" />
```

This is acceptable for client-only interactive views.

---

## Empty States

Empty data is **not** an error — render helpful empty UI:

```tsx
import { Empty } from "@/components/ui/empty"

if (!trades.length) {
  return (
    <Empty>
      <p>No trades recorded</p>
      <Button onClick={() => setDialogOpen(true)}>Add trade</Button>
    </Empty>
  )
}
```

---

## Mutation Errors

Use sonner for mutation failures:

```typescript
import { toast } from "sonner"

mutation.mutate(data, {
  onError: () => toast.error("Failed to save cash flow"),
})
```

---

## Summary

| State | Pattern |
|-------|---------|
| Route loading | `loading.tsx` + Skeleton |
| Route error | `error.tsx` (optional) |
| Client fetch loading | `isLoading` from `useQuery` |
| Empty list | Inline empty component, not error |
| Mutation failure | sonner `toast.error` |
