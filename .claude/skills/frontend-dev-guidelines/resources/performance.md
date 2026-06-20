# Performance Optimization

**fintu-tracking** follows a "profile first" approach — avoid premature memoization.

---

## Profile First

1. Identify visible jank or slow interactions
2. Use React DevTools Profiler
3. Apply targeted fixes only when profiling confirms benefit

React 19 reduces the need for manual `useMemo` / `useCallback`.

---

## When useMemo Helps

Large list filtering/sorting on every render:

```tsx
const filteredTrades = useMemo(() => {
  return trades.filter((t) => t.symbol.includes(search))
}, [trades, search])
```

Skip for trivial computations (`items.length`, string concat).

---

## Code Splitting

Next.js automatically code-splits by route. For heavy client components, use dynamic import:

```tsx
import dynamic from "next/dynamic"

const PerformanceCharts = dynamic(
  () => import("@/components/performance/performance-charts").then((m) => m.PerformanceCharts),
  { loading: () => <Skeleton className="h-64 w-full" /> }
)
```

---

## TanStack Query Cache

- Shared query keys prevent duplicate fetches across components
- Set appropriate `staleTime` (default 1 min in `providers.tsx`)
- Invalidate narrowly after mutations

---

## Images and Charts

- Use Next.js `Image` for optimized images when applicable
- Chart libraries (recharts via shadcn `chart`) — lazy load on performance pages if bundle size grows

---

## List Rendering

- Stable keys: `trade.id`, not array index
- Virtualize only when lists are large and profiling shows need

---

## Summary

- Profile before optimizing
- Route-level splitting via App Router
- Query cache for server state
- Dynamic import for heavy client components
