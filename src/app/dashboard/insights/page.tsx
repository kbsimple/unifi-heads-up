import { InsightsShell } from '@/components/insights/insights-shell'

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

      <InsightsShell />
    </div>
  )
}
