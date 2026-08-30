import type { ReactElement, ReactNode } from "react"

interface SettingsRowProps {
  htmlFor: string
  label: string
  children: ReactNode
}

export function SettingsRow({ htmlFor, label, children }: SettingsRowProps): ReactElement {
  return (
    <div className="flex min-h-11 flex-col items-stretch gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="min-w-0 w-full sm:w-auto sm:shrink-0">{children}</div>
    </div>
  )
}
