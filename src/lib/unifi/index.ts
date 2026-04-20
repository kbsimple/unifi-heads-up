// src/lib/unifi/index.ts
// Facade: re-exports real or mock UniFi client based on UNIFI_MOCK env var.
// process.env.UNIFI_MOCK is evaluated once at module initialisation (server startup),
// not per-request. Flip requires a server restart — this is intentional.
import 'server-only'

import * as real from './client'
import * as mock from './mock'

const impl = process.env.UNIFI_MOCK === 'true' ? mock : real

export const getUnifiClients            = impl.getUnifiClients
export const getFirewallPolicies        = impl.getFirewallPolicies
export const updateFirewallPolicy       = impl.updateFirewallPolicy
export const isZoneBasedFirewallEnabled = impl.isZoneBasedFirewallEnabled
