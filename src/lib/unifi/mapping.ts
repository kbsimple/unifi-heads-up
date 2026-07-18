import type { FirewallPolicy } from './types'

export interface DeviceTarget {
  mac: string
  ip?: string | null
}

// NOTE: ZBF field names (source.client_macs, destination.client_macs) are observed
// from aiounifi source and community reports but need live-console verification
// against a real UniFi OS firmware 9.0+ device before relying on them in production.

function matchZBF(policies: FirewallPolicy[], mac: string): FirewallPolicy[] {
  const needle = mac.toLowerCase()
  return policies.filter(p => {
    const src = p.source?.client_macs ?? []
    const dst = p.destination?.client_macs ?? []
    return src.some(m => m.toLowerCase() === needle) ||
           dst.some(m => m.toLowerCase() === needle)
  })
}

function matchLegacy(policies: FirewallPolicy[], { mac, ip }: DeviceTarget): FirewallPolicy[] {
  const needle = mac.toLowerCase()
  return policies.filter(p => {
    // passthrough() preserves srcMac and srcAddress from raw API responses
    const raw = p as Record<string, unknown>
    const srcMac = typeof raw.srcMac === 'string' ? raw.srcMac.toLowerCase() : null
    const srcAddress = typeof raw.srcAddress === 'string' ? raw.srcAddress : null

    if (srcMac && srcMac === needle) return true
    if (ip && srcAddress && srcAddress === ip) return true
    return false
  })
}

/**
 * Returns firewall policies that target the given device.
 * @param policies - All firewall policies from the UniFi API
 * @param device - The device to match (MAC required; IP used for legacy mode only)
 * @param isZBF - ZBF mode flag, resolved once at startup via isZoneBasedFirewallEnabled()
 */
export function getRulesForDevice(
  policies: FirewallPolicy[],
  device: DeviceTarget,
  isZBF: boolean
): FirewallPolicy[] {
  return isZBF ? matchZBF(policies, device.mac) : matchLegacy(policies, device)
}
