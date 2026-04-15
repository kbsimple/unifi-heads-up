// src/lib/utils/format.ts

/**
 * Format a date as relative time string
 * Per DEVI-04: Display last active timestamp
 *
 * @param date - Date to format, or null for unknown
 * @returns Relative time string like "just now", "5m ago", "2h ago", or "Unknown"
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Unknown'

  const now = Date.now()
  const then = date.getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}