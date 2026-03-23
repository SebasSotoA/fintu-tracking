export default function TradesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-9 w-28 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-10 bg-muted rounded" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}
