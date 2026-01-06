import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { ReturnAttribution } from "@/components/analytics/return-attribution";
import { FeeAttributionChart } from "@/components/analytics/fee-attribution-chart";
import { PerformanceCharts } from "@/components/performance/performance-charts";
import { PerformanceMetrics } from "@/components/performance/performance-metrics";

export default async function PerformancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Performance Analysis</h1>
          <p className="text-muted-foreground">
            Deep dive into your portfolio returns, fees, and FX impact
          </p>
        </div>

        <div className="space-y-6">
          {/* Return Attribution Waterfall */}
          <ReturnAttribution />

          {/* Fee Attribution Charts */}
          <FeeAttributionChart />

          {/* Performance Timeline */}
          <PerformanceCharts />

          {/* Performance Metrics */}
          <PerformanceMetrics />
        </div>
      </div>
    </div>
  );
}
