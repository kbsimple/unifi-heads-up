const PACIFIC_TZ = 'America/Los_Angeles'

/**
 * Parse a date+time string stored in Pacific time and return UTC milliseconds.
 * Avoids the naive `new Date("YYYY-MMDDTHH:MM")` trap, which is interpreted as
 * server-local (UTC in Docker) rather than the timezone the UniFi console uses.
 */
export function parsePacificDateTime(dateStr: string, timeStr: string): number {
  const naive = new Date(`${dateStr}T${timeStr}:00`)
  if (isNaN(naive.getTime())) return NaN
  const pacHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: PACIFIC_TZ,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(naive),
    10
  )
  let offsetHours = pacHour - naive.getUTCHours()
  if (offsetHours < -12) offsetHours += 24
  if (offsetHours > 12) offsetHours -= 24
  return naive.getTime() - offsetHours * 3_600_000
}

export function formatPacificHour(unixTs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    hour12: true,
  }).format(new Date(unixTs * 1000))
}

export function getCurrentPacificHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date()),
    10
  )
}

export function formatBucketLabel(unixSec: number, bucketSec: number): string {
  if (bucketSec >= 3600) {
    return formatPacificHour(unixSec)
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(unixSec * 1000))
}

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
