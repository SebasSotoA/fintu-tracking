# Cutting-Edge React Practices (fintu-tracking)

React 19 + Next.js 16 App Router — what we use and what to skip.

---

## Stack Context

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router |
| Rendering | Server Components + Client Components |
| Auth | Supabase `@supabase/ssr` |
| Server state (client) | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| UI | shadcn/ui + Tailwind 4 |

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Server Components | **USE** | Default for pages/layouts without client hooks |
| Client Components | **USE** | `"use client"` for Query, forms, interactivity |
| React Server Components data | **USE** | Server fetch when appropriate |
| `useSuspenseQuery` | **OPTIONAL** | When Suspense boundary exists |
| `useQuery` | **USE** | Default client fetch with explicit loading UI |
| React 19 `ref` as prop | **USE** | No forwardRef needed |
| React Compiler / auto-memo | **USE** | Avoid premature useMemo/useCallback |
| React Router | **DO NOT USE** | App Router file-based routing |
| Vite SPA patterns | **DO NOT USE** | This is Next.js |
| Cognito / apiGateway | **DO NOT USE** | Supabase + ApiClient |

---

## Server vs Client Decision Tree

1. Needs hooks, events, or browser APIs? → **Client component**
2. Static or server-fetchable with no client state? → **Server component**
3. Mixed? → Server page shell + client child components

---

## useEffect

Prefer alternatives (see `react-useeffect` skill):
- Data fetch → TanStack Query or server component
- Derived state → compute inline or useMemo
- Event side effects → event handlers
- Subscriptions → useEffect with cleanup

---

## Concurrent Features

`startTransition` and `useDeferredValue` for keeping UI responsive during heavy updates (e.g. filtering large trade lists).

---

## Suspense

- Route-level: `loading.tsx` in App Router
- Component-level: wrap children that use `useSuspenseQuery` if adopted

---

## Summary

- Next.js App Router, not React Router or Vite SPA
- Server components by default; client when needed
- TanStack Query + ApiClient for Go API from client
- Profile before manual memoization
