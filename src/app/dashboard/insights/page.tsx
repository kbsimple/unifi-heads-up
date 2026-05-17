import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = { title: 'Insights — Unifi Dashboard' }

export default function InsightsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Insights</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Bandwidth usage and activity patterns across your devices
        </p>
      </div>

      {/* InsightsShell replaces this block in Plan 03 */}
      <div id="insights-root">
        {/* Top Devices section */}
        <section aria-label="Top Devices">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Top Devices</h2>
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            {/* TopDevicesChart inserted here in Plan 03 */}
            <Skeleton className="h-64 w-full rounded-lg bg-zinc-800" />
          </Suspense>
        </section>

        {/* Device Activity section */}
        <section aria-label="Device Activity" className="mt-8">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">Device Activity</h2>
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
            {/* DeviceActivityHeatmap inserted here in Plan 03 */}
            <Skeleton className="h-48 w-full rounded-lg bg-zinc-800" />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
