---
name: frontend-dev-guidelines
description: >-
  Frontend development guidelines for fintu-tracking (Next.js 16 App Router).
  Patterns for Supabase auth, TanStack Query, ApiClient, Tailwind 4 + shadcn/ui,
  sonner toasts, react-hook-form + Zod, and feature-colocated components.
  Use when creating components, pages, fetching data, styling, or working with frontend code.
---

# Frontend Development Guidelines

## Purpose

Guide for **fintu-tracking** frontend: personal portfolio tracker with dashboard, trades, cash flows, and performance views. Stack: Next.js 16 App Router, Supabase SSR auth, Go Fiber API, TanStack Query, shadcn/ui, sonner.

## When to Use This Skill

- Creating pages under `frontend/app/`
- Building feature components under `frontend/components/`
- Fetching data via `ApiClient` or TanStack Query
- Forms, validation, loading/error states
- TypeScript and file organization

---

## Quick Start

### New Component Checklist

- [ ] Plain function component with typed props interface (no `React.FC`)
- [ ] Add `"use client"` only if the component needs hooks, events, or browser APIs
- [ ] Style with Tailwind utilities; use shadcn/ui from `@/components/ui/`
- [ ] API calls via `ApiClient` (`@/lib/api/client.ts`) or shared query hooks — not raw fetch in UI
- [ ] Notifications via **sonner**: `import { toast } from "sonner"`
- [ ] Forms: React Hook Form + Zod + shadcn `<Form>` components
- [ ] Colocate Vitest tests: `Component.test.tsx` next to source

### New Page Checklist (App Router)

- [ ] Create route under `frontend/app/` (e.g. `app/(app)/trades/page.tsx`)
- [ ] Add co-located `loading.tsx` for route-level skeleton when page is async
- [ ] Add `error.tsx` when the route has meaningful failure modes
- [ ] Use server components for static/layout; client components for interactive data UI
- [ ] Wrap client subtrees in providers from `components/providers.tsx` (QueryClient)

### Server vs Client Data Fetching

| Use case | Pattern |
|----------|---------|
| Initial page data, SEO-friendly reads | **Server component** + direct fetch or Supabase server client |
| Interactive lists, mutations, polling | **Client component** + `useQuery` / `useMutation` + `ApiClient` |
| Auth-gated API to Go backend | Client `ApiClient` (Bearer from Supabase session) |

Do **not** mandate `useSuspenseQuery` everywhere — use it when Suspense boundaries are in place; otherwise `useQuery` with explicit loading UI is fine in client components.

---

## Import Alias

| Alias | Resolves To |
|-------|-------------|
| `@/` | `frontend/` root (app, components, lib) |

```typescript
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
```

---

## Common Imports

```typescript
// Next.js
import Link from "next/link"
import { useRouter } from "next/navigation"

// TanStack Query (client components)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// API
import { apiClient } from "@/lib/api/client"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Forms
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Notifications
import { toast } from "sonner"

// Utils
import { cn } from "@/lib/utils"
```

---

## API Layer

`frontend/lib/api/client.ts` exports `ApiClient`:
- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`)
- Attaches `Authorization: Bearer <token>` from Supabase session
- Methods: `get`, `post`, `put`, `delete`

Validate responses with Zod at the boundary when schemas exist.

---

## Resource Files

| Need to... | Read this |
|------------|-----------|
| Component structure, shadcn patterns | [component-patterns.md](resources/component-patterns.md) |
| Data fetching, Query, ApiClient | [data-fetching.md](resources/data-fetching.md) |
| Loading/error/empty states | [loading-and-error-states.md](resources/loading-and-error-states.md) |
| Forms, tables, toasts | [common-patterns.md](resources/common-patterns.md) |
| File/folder layout | [file-organization.md](resources/file-organization.md) |
| TypeScript standards | [typescript-standards.md](resources/typescript-standards.md) |
| Performance | [performance.md](resources/performance.md) |
| React 19 / App Router notes | [cutting-edge-react-practices.md](resources/cutting-edge-react-practices.md) |

---

## Core Principles

1. **App Router first** — file-based routing in `app/`, not React Router
2. **Supabase auth** — `@/lib/supabase/client` (browser), `@/lib/supabase/server` (RSC)
3. **ApiClient for Go API** — Bearer JWT, not cookie-based apiGateway
4. **TanStack Query for client server-state** — mutations invalidate related keys
5. **sonner for toasts** — `<Toaster />` in root layout
6. **shadcn/ui + Tailwind 4** — no MUI
7. **Feature folders** — `components/trades/`, `components/cash-flows/`, etc.
8. **TDD with Vitest** — colocated `*.test.tsx` files

---

## Related Skills

- **[tdd-workflow](../tdd-workflow/SKILL.md)** — RED/GREEN/REFACTOR
- **[react-useeffect](../react-useeffect/SKILL.md)** — Effect decision tree

**Skill Status**: Adapted for fintu-tracking — Next.js 16, Supabase, Fiber API, TanStack Query, shadcn/ui, sonner.
