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
