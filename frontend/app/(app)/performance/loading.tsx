export default function PerformanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-9 w-56 bg-muted rounded" />
        <div className="h-4 w-80 bg-muted rounded" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-64 bg-muted rounded-lg" />
      ))}
    </div>
  )
}
