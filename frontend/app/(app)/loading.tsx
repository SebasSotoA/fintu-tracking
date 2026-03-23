export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-48 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
      <div className="h-36 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-lg" />
      <div className="space-y-3">
        <div className="h-10 bg-muted rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}
