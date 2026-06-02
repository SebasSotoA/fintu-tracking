export default function PerformanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-64 bg-muted rounded-lg" />
      ))}
    </div>
  )
}
