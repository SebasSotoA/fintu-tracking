"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/components/locale-provider"

interface AppRouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}

export function AppRouteError({
  error,
  reset,
  title,
}: AppRouteErrorProps) {
  const { t } = useLocale()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Card className="mx-auto mt-8 max-w-lg">
      <CardHeader>
        <CardTitle>{title ?? t("errors.somethingWentWrong")}</CardTitle>
        <CardDescription>{t("errors.couldNotLoad")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => reset()}>
          {t("errors.tryAgain")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard">{t("errors.goToDashboard")}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
