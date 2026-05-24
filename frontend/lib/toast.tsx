import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const iconClass = 'h-4 w-4 shrink-0'

export const showToast = {
  success(message: string) {
    return toast.success(message, {
      icon: (
        <CheckCircle2
          className={iconClass}
          style={{ color: 'var(--primary)' }}
          aria-hidden
        />
      ),
    })
  },
  error(message: string) {
    return toast.error(message, {
      icon: (
        <XCircle
          className={iconClass}
          style={{ color: 'var(--destructive)' }}
          aria-hidden
        />
      ),
    })
  },
  loading(message: string) {
    return toast.loading(message, {
      icon: (
        <Loader2
          className={`${iconClass} animate-spin`}
          style={{ color: 'var(--muted-foreground)' }}
          aria-hidden
        />
      ),
    })
  },
  dismiss(id: string | number) {
    toast.dismiss(id)
  },
}
