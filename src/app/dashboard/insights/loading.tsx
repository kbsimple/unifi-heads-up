import { Skeleton } from '@/components/ui/skeleton'

export default function InsightsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          {['w-16', 'w-16', 'w-16'].map((w, i) => (
            <Skeleton key={i} className={`h-8 ${w} rounded-full`} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}
