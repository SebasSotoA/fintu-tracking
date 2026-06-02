"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AppRouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}

export function AppRouteError({
  error,
  reset,
  title = "Something went wrong",
}: AppRouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Card className="mx-auto mt-8 max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>We could not load this page. You can try again or return home.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
