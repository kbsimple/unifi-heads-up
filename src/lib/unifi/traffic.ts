// src/lib/unifi/traffic.ts

/**
 * Traffic status thresholds in Mbps
 * Per RESEARCH.md Pattern 3 and PROJECT.md requirements:
 * - Idle: < 1 Mbps
 * - Low: 1-10 Mbps
 * - Medium: 10-100 Mbps
 * - High: > 100 Mbps
 */
export const TRAFFIC_THRESHOLDS = {
  IDLE: 1, // < 1 Mbps
  LOW: 10, // 1-10 Mbps
  MEDIUM: 100, // 10-100 Mbps
  // HIGH: > 100 Mbps
} as const

/**
 * Convert bytes per second to Megabits per second
 * Formula: (bytes * 8) / 1,000,000 (convert to bits, then to megabits)
 */
export function bytesPerSecToMbps(bytesPerSec: number): number {
  return (bytesPerSec * 8) / 1_000_000
}

/**
 * Calculate traffic status from bandwidth rates
 * Per DEVI-02: High/Medium/Low/Idle based on combined download + upload
 *
 * Note: Using instant rates from rx_bytes-r and tx_bytes-r.
 * For v1, this approximates the 5-min rolling average requirement.
 *
 * @param downloadBytesPerSec - Download rate in bytes per second
 * @param uploadBytesPerSec - Upload rate in bytes per second
 * @returns Traffic status level
 */
export function calculateTrafficStatus(
  downloadBytesPerSec: number,
  uploadBytesPerSec: number
): 'idle' | 'low' | 'medium' | 'high' {
  // Combine download and upload for total bandwidth
  const totalMbps = bytesPerSecToMbps(downloadBytesPerSec + uploadBytesPerSec)

  if (totalMbps < TRAFFIC_THRESHOLDS.IDLE) {
    return 'idle'
  }
  if (totalMbps < TRAFFIC_THRESHOLDS.LOW) {
    return 'low'
  }
  if (totalMbps < TRAFFIC_THRESHOLDS.MEDIUM) {
    return 'medium'
  }
  return 'high'
}