# Data Fetching Patterns

Data fetching in **fintu-tracking**: Next.js App Router, Supabase auth, TanStack Query on the client, `ApiClient` for the Go Fiber backend.

---

## ApiClient (Primary API Layer)

```typescript
import { apiClient } from "@/lib/api/client"

// GET with Bearer token (from Supabase session)
const portfolio = await apiClient.get<Portfolio>("/portfolio")

// POST mutation
await apiClient.post("/trades", { symbol: "AAPL", quantity: 10 })
```

- Base URL: `process.env.NEXT_PUBLIC_API_URL` || `http://localhost:8080`
- Auth: `Authorization: Bearer <access_token>` from Supabase
- Throws on non-OK responses

Do **not** use axios or ad-hoc fetch in components — use `apiClient` or hooks that wrap it.

---

## Server Components vs Client Components

### Server component (page or layout)

Fetch on the server when data is needed for initial render and no client interactivity is required:

```tsx
// app/(app)/dashboard/page.tsx — example pattern
export default async function DashboardPage() {
  // Optional: server-side fetch or Supabase server client
  return <DashboardContent />
}
```

### Client component (interactive UI)

Use TanStack Query for reads and mutations:

```tsx
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"

export function TradesList() {
  const { data: trades, isLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: () => apiClient.get<Trade[]>("/trades"),
  })
  // ...
}
```

### When to use useQuery vs useSuspenseQuery

| Hook | Use when |
|------|----------|
| `useQuery` | Default for client components; explicit `isLoading` / `error` handling |
| `useSuspenseQuery` | Parent provides `<Suspense>` boundary and you want guaranteed `data` |
| Server fetch | Static or SSR-first pages without client polling |

---

## Query Key Conventions

```typescript
["portfolio"]
["trades"]
["trades", tradeId]
["cash-flows"]
["performance", { period: "1Y" }]
["fx-rates", baseCurrency]
```

Invalidate related keys after mutations (e.g. trade create → `["trades"]`, `["portfolio"]`).

---

## Mutations

```typescript
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: (body: CreateCashFlowInput) =>
    apiClient.post("/cash-flows", body),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["cash-flows"] })
    queryClient.invalidateQueries({ queryKey: ["portfolio"] })
  },
})
```

Show user feedback with sonner at the call site.

---

## Zod Validation

Validate API responses at the boundary when schemas exist:

```typescript
const TradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  quantity: z.number(),
})

const raw = await apiClient.get<unknown>("/trades")
return z.array(TradeSchema).parse(raw)
```

Transform `null` arrays to `[]` at the schema layer when the backend may return null.

---

## Query Client Defaults

Configured in `components/providers.tsx`:
- `staleTime: 60_000` (1 minute)
- `refetchOnWindowFocus: false`

Override per-query when needed.

---

## Backend Endpoints (examples)

Handlers in `backend/internal/handlers/`:
- Portfolio: `/portfolio`
- Trades: `/trades`
- Cash flows: `/cash-flows`
- FX rates, analytics, brokers — see handler files

All protected routes expect valid Supabase JWT.

---

## Summary

| Concept | Pattern |
|---------|---------|
| API client | `apiClient` from `@/lib/api/client` |
| Auth header | Bearer from Supabase session |
| Client reads | `useQuery` or `useSuspenseQuery` |
| Mutations | `useMutation` + invalidateQueries |
| Toasts | sonner at call site |
| Server reads | Server components when appropriate |
