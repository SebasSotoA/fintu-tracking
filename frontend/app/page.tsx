import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { TrendingUp, DollarSign, PieChart, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Track Your USD Investments
            <span className="block text-primary">with COP Precision</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl text-pretty">
            Built for LATAM retail investors. Accurately account for FX rates, fees, and real performance across
            currencies.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Multi-Currency</h3>
                <p className="text-sm text-muted-foreground">Track COP to USD conversions with historical FX rates</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Accurate Cost Basis</h3>
                <p className="text-sm text-muted-foreground">Average cost method with fee tracking</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Portfolio View</h3>
                <p className="text-sm text-muted-foreground">Real-time holdings with P/L in both currencies</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Performance</h3>
                <p className="text-sm text-muted-foreground">XIRR calculations and fee impact analysis</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
