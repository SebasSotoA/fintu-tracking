import { PerformanceContent } from "@/components/performance/performance-content"

export default function PerformancePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Performance Analysis</h1>
        <p className="text-muted-foreground">
          Deep dive into your portfolio returns, fees, and FX impact
        </p>
      </div>
      <PerformanceContent />
    </>
  )
}
