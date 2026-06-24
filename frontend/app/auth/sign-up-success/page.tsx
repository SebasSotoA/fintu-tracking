import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth/auth-card"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <AuthCard
      title="Check your email"
      description="We sent you a confirmation link"
    >
      <p className="text-sm text-muted-foreground">
        Please check your email and click the confirmation link to activate your account.
      </p>
      <Button asChild className="w-full">
        <Link href="/auth/login">Back to login</Link>
      </Button>
    </AuthCard>
  )
}
