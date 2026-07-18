import { Skeleton } from '@/components/ui/skeleton'

export default function FirewallLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="flex justify-end">
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
