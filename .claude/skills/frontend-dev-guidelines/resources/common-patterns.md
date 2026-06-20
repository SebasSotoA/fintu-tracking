# Common Patterns

Forms, dialogs, tables, notifications, and mutations for **fintu-tracking**.

---

## Authentication (Supabase)

Browser client: `@/lib/supabase/client`. Server: `@/lib/supabase/server`.

Protected app routes live under `app/(app)/` with layout auth checks. Do not roll custom JWT storage — use Supabase session APIs.

```typescript
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

## Forms with React Hook Form + Zod + shadcn

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form"

const tradeSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  quantity: z.coerce.number().positive(),
})

type TradeFormData = z.infer<typeof tradeSchema>

export function AddTradeForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: { symbol: "", quantity: 0 },
  })

  const onSubmit = async (data: TradeFormData) => {
    try {
      await apiClient.post("/trades", data)
      toast.success("Trade added")
      onSuccess()
    } catch {
      toast.error("Failed to add trade")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symbol</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
```

---

## Dialog / Sheet Patterns

Use shadcn `Dialog` for modals (see `components/trades/add-trade-dialog.tsx`) and `Sheet` for side panels.

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Trade</DialogTitle>
    </DialogHeader>
    {/* form content */}
  </DialogContent>
</Dialog>
```

Use `AlertDialog` for destructive confirmations (see `components/trades/delete-trade-dialog.tsx`).

---

## Tables

Use shadcn `Table` components (see `components/dashboard/holdings-table.tsx`, `components/trades/trades-list.tsx`).

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
```

---

## Notifications (sonner)

```typescript
import { toast } from "sonner"

toast.success("Cash flow saved")
toast.error("Failed to load portfolio")
```

`<Toaster />` is mounted in the root layout via `@/components/ui/sonner`.

---

## Mutations with TanStack Query

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { toast } from "sonner"

export function useCreateTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTradeInput) => apiClient.post("/trades", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] })
      queryClient.invalidateQueries({ queryKey: ["portfolio"] })
    },
  })
}

// At call site:
const createTrade = useCreateTrade()
createTrade.mutate(data, {
  onSuccess: () => toast.success("Trade created"),
  onError: () => toast.error("Failed to create trade"),
})
```

Keep toast feedback at the call site when hooks are reused.

---

## Summary

| Pattern | Tool |
|---------|------|
| Auth | Supabase (`@/lib/supabase/*`) |
| API | `apiClient` from `@/lib/api/client` |
| Forms | RHF + Zod + shadcn Form |
| Notifications | sonner |
| Server state | TanStack Query |
| UI state | `useState` in client components |
| Tables/Dialogs | shadcn/ui |
