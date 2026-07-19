import type { FirewallPolicy } from './types'

export interface DeviceTarget {
  mac: string
  ip?: string | null
}

/**
 * Returns firewall policies that target the given device.
 *
 * Tries both ZBF (source/destination.client_macs) and legacy (srcMac/srcAddress)
 * field shapes in a single pass — the console may have a mix of both, and the
 * feature-flag endpoint that distinguishes the two is unreliable on firmware 9.x.
 */
export function getRulesForDevice(
  policies: FirewallPolicy[],
  device: DeviceTarget,
): FirewallPolicy[] {
  const needle = device.mac.toLowerCase()
  return policies.filter(p => {
    // ZBF: source.client_macs / destination.client_macs
    const src = p.source?.client_macs ?? []
    const dst = p.destination?.client_macs ?? []
    if (src.some(m => m.toLowerCase() === needle) ||
        dst.some(m => m.toLowerCase() === needle)) return true

    // Legacy: srcMac / srcAddress (preserved via schema passthrough)
    const raw = p as Record<string, unknown>
    const srcMac = typeof raw.srcMac === 'string' ? raw.srcMac.toLowerCase() : null
    const srcAddress = typeof raw.srcAddress === 'string' ? raw.srcAddress : null
    if (srcMac && srcMac === needle) return true
    if (device.ip && srcAddress && srcAddress === device.ip) return true

    return false
  })
}
