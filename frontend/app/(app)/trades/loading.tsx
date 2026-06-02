export default function TradesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-end mb-8">
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
