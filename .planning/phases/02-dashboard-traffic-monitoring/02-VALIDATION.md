---
phase: 02-dashboard-traffic-monitoring
created: 2026-04-14
test_framework: vitest
---

# Phase 2: Dashboard & Traffic Monitoring - Validation Strategy

**Created:** 2026-04-14
**Framework:** Vitest 4.1.4 (established in Phase 1)

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:run` |
| Full suite command | `pnpm test` |

## Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Test File | Status |
|--------|----------|-----------|-----------|--------|
| DEVI-01 | View clients with name, MAC, IP | unit | `tests/lib/unifi/client.test.ts` | Wave 0 |
| DEVI-02 | See traffic status per client | unit | `tests/lib/unifi/traffic.test.ts` | Wave 0 |
| DEVI-03 | Device name fallback chain | unit | `tests/lib/unifi/traffic.test.ts` | Wave 0 |
| DEVI-04 | Last active timestamp display | unit | `tests/components/dashboard/last-updated.test.tsx` | Wave 0 |
| DEVI-05 | Auto-refresh every 60 seconds | integration | `tests/components/dashboard/client-list.test.tsx` | Wave 0 |
| UIUX-01 | Responsive card/table layout | visual | Manual review | N/A |
| UIUX-02 | Traffic status color coding | unit | `tests/components/dashboard/traffic-badge.test.tsx` | Wave 0 |
| UIUX-03 | Last updated timestamp | unit | `tests/components/dashboard/last-updated.test.tsx` | Wave 0 |
| UIUX-05 | Offline/unavailable state | unit | `tests/components/dashboard/client-list.test.tsx` | Wave 0 |

## Sampling Rate

- **Per task commit:** `pnpm test:run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

## Wave 0 Test Files

These test files must be created before phase execution:

- [ ] `tests/lib/unifi/client.test.ts` - UniFi API client tests (DEVI-01)
- [ ] `tests/lib/unifi/traffic.test.ts` - Traffic calculation tests (DEVI-02, DEVI-03)
- [ ] `tests/components/dashboard/client-card.test.tsx` - Card rendering tests
- [ ] `tests/components/dashboard/traffic-badge.test.tsx` - Badge color tests (UIUX-02)
- [ ] `tests/components/dashboard/last-updated.test.tsx` - Timestamp tests (UIUX-03, DEVI-04)
- [ ] `tests/components/dashboard/client-list.test.tsx` - Polling tests (DEVI-05, UIUX-05)
- [ ] `tests/app/api/clients/route.test.ts` - API route tests
- [ ] Mock setup for UniFi API responses in `tests/mocks/unifi.ts`

## Test Infrastructure

Phase 2 builds on Phase 1 test infrastructure:

- `vitest.config.ts` - Vitest configuration (jsdom environment)
- `tests/setup.ts` - Test environment setup
- `@testing-library/react` - Component testing utilities

## Mock Strategy

UniFi API responses should be mocked to avoid hitting real API during tests:

```typescript
// tests/mocks/unifi.ts
export const mockUnifiClient = {
  mac: '00:11:22:33:44:55',
  name: 'Test Device',
  hostname: 'test-device.local',
  ip: '192.168.1.100',
  last_seen: Date.now() - 300000, // 5 minutes ago
  is_wired: true,
  is_guest: false,
  'rx_bytes-r': 1250000, // 1.25 MB/s = 10 Mbps
  'tx_bytes-r': 250000,  // 0.25 MB/s = 2 Mbps
}
```

## Coverage Targets

| Requirement | Coverage Target |
|-------------|-----------------|
| DEVI-01 | Client types, transformation |
| DEVI-02 | Traffic calculation, status mapping |
| DEVI-03 | Name fallback logic |
| DEVI-05 | SWR polling configuration |
| UIUX-02 | Badge color classes |
| UIUX-05 | Error state handling |

---

*Phase: 02-dashboard-traffic-monitoring*
*Validation strategy created: 2026-04-14*