export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-muted rounded-lg w-3/4" />
          <div className="h-6 bg-muted rounded w-1/2" />
        </div>

        <div className="grid gap-6 animate-pulse">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  )
}
