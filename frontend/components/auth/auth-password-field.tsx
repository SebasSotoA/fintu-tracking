"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/components/locale-provider"

interface AuthPasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  disabled?: boolean
  placeholder?: string
  required?: boolean
  minLength?: number
  forgotHref?: string
  forgotLabel?: string
  "aria-invalid"?: boolean
}

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  placeholder,
  required,
  minLength,
  forgotHref,
  forgotLabel,
  "aria-invalid": ariaInvalid,
}: AuthPasswordFieldProps): React.ReactElement {
  const { t } = useLocale()
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {forgotHref && forgotLabel ? (
          <Link
            href={forgotHref}
            className="text-xs text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {forgotLabel}
          </Link>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          aria-invalid={ariaInvalid}
          className="h-10 rounded-lg bg-background pr-10 dark:bg-background"
        />
        <button
          type="button"
          tabIndex={0}
          disabled={disabled}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  )
}
