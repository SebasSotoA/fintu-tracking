import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthAlertProps {
  error: string | null
}

export function AuthAlert({ error }: AuthAlertProps): React.ReactElement | null {
  if (!error) return null

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" aria-hidden />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}
