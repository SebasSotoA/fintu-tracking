# File Organization

Directory structure for the **fintu-tracking** Next.js frontend.

---

## Folder Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (providers, Toaster)
│   ├── page.tsx                  # Landing
│   ├── globals.css
│   ├── auth/                     # login, sign-up, callback, reset-password
│   └── (app)/                    # Authenticated app shell
│       ├── layout.tsx
│       ├── dashboard/
│       │   ├── page.tsx
│       │   └── loading.tsx
│       ├── trades/
│       ├── cash-flows/
│       └── performance/
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # nav, shell
│   ├── dashboard/
│   ├── trades/
│   ├── cash-flows/
│   ├── performance/
│   ├── analytics/
│   └── providers.tsx             # QueryClientProvider
│
├── lib/
│   ├── api/
│   │   └── client.ts             # ApiClient
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase
│   │   └── server.ts             # Server Supabase
│   └── utils.ts                  # cn(), helpers
│
└── public/                       # Static assets
```

---

## Naming Conventions

| Kind | Convention | Example |
|------|------------|---------|
| Route folders | kebab-case | `cash-flows/` |
| Page files | `page.tsx`, `loading.tsx`, `error.tsx` | App Router convention |
| Components | kebab-case files, PascalCase export | `holdings-table.tsx` → `HoldingsTable` |
| Hooks | camelCase, `use` prefix | `usePortfolio.ts` |
| Tests | colocated `.test.ts(x)` | `trades-list.test.tsx` |
| shadcn ui | kebab-case | `components/ui/button.tsx` |

---

## Import Order

```typescript
// 1. React / Next
import { useState } from "react"
import Link from "next/link"

// 2. Third-party
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

// 3. @/ aliases
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import type { Trade } from "@/lib/types"

// 4. Relative (same feature folder)
import { TradeRow } from "./trade-row"
```

Use `@/` for cross-folder imports; relative imports within a feature folder are fine.

---

## When to Create What

### New route
Add under `app/(app)/<feature>/` with `page.tsx`; add `loading.tsx` when async.

### New feature component
Add under `components/<feature>/` matching the domain (trades, cash-flows, etc.).

### New shared UI primitive
Add via shadcn CLI → lands in `components/ui/`.

### New API helper
Extend or wrap `lib/api/client.ts`; feature-specific types in `lib/` or next to the feature.

### New test
Colocate `*.test.tsx` beside the source file.

---

## Summary

1. **App Router** in `app/` — not a central `router.tsx`
2. **Feature folders** in `components/` — not atoms/molecules/organisms
3. **`@/` alias** maps to frontend root
4. **ApiClient + Supabase** live in `lib/`
5. **Colocated Vitest** tests
