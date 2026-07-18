import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="h-12 border-b border-zinc-800 px-4 flex items-center gap-4">
          {['w-32', 'w-24', 'w-32', 'w-20', 'w-20', 'w-16', 'w-20', 'w-24', 'w-16'].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-zinc-800 px-4 flex items-center gap-4">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}
