export function formatHourOfDay(hour: number): string {
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h = hour % 12 || 12
  return `${h}${ampm}`
}

export function formatRate(bytesPerSec: number): string {
  const mbps = (bytesPerSec * 8) / 1_000_000
  if (mbps < 0.1) return '—'
  if (mbps >= 100) return `${mbps.toFixed(0)} Mbps`
  if (mbps >= 10) return `${mbps.toFixed(1)} Mbps`
  return `${mbps.toFixed(2)} Mbps`
}

export function formatTimeAgo(value: Date | number | null): string {
  if (value === null) return '—'
  const then = typeof value === 'number' ? value : value.getTime()
  const diffMs = Date.now() - then
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}
