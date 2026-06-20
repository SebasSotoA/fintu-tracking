# TypeScript Standards

TypeScript best practices for **fintu-tracking** frontend.

---

## Strict Mode

Project uses strict TypeScript. Use `import type` for type-only imports (`verbatimModuleSyntax` when enabled).

```typescript
import type { Trade } from "@/lib/types"
import { apiClient } from "@/lib/api/client"
```

---

## No `any`

Use specific types or `unknown` with guards:

```typescript
function parseTrades(data: unknown): Trade[] {
  return z.array(TradeSchema).parse(data)
}
```

---

## Props Interfaces

Suffix with `Props`; no `React.FC`:

```typescript
interface NetWorthCardProps {
  value: number
  currency?: string
}

export function NetWorthCard({ value, currency = "USD" }: NetWorthCardProps) {
  // ...
}
```

---

## Zod for Runtime Validation

Define schemas for API boundaries and form input:

```typescript
export const CreateTradeSchema = z.object({
  symbol: z.string().min(1),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().nonnegative(),
})

export type CreateTradeInput = z.infer<typeof CreateTradeSchema>
```

---

## Explicit Return Types

Public exported functions should declare return types:

```typescript
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}
```

---

## Type Checking Command

No `type-check` npm script yet — run:

```bash
cd frontend && pnpm exec tsc --noEmit
```

Run after modifying TypeScript files and before commit.

---

## Summary

- Strict mode, no `any`
- `import type` for types
- Zod at API/form boundaries
- Explicit return types on exports
- `pnpm exec tsc --noEmit` for verification
