import { describe, it, expect } from 'vitest'
import { getRulesForDevice } from './mapping'
import type { FirewallPolicy } from './types'

const zbfPolicies: FirewallPolicy[] = [
  { _id: 'p1', name: 'Block Switch',      enabled: true,  source: { client_macs: ['aa:bb:cc:dd:ee:06'] } },
  { _id: 'p2', name: 'Block MacBook Dst', enabled: false, destination: { client_macs: ['aa:bb:cc:dd:ee:01'] } },
  { _id: 'p3', name: 'Unrelated',         enabled: true },
]

const legacyPolicies: FirewallPolicy[] = [
  { _id: 'p4', name: 'Block MacBook', enabled: false, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
  { _id: 'p5', name: 'Block by IP',   enabled: true,  srcAddress: '192.168.1.102' } as FirewallPolicy,
  { _id: 'p6', name: 'Unrelated',     enabled: true },
]

describe('getRulesForDevice — ZBF fields', () => {
  it('matches source.client_macs by MAC', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'aa:bb:cc:dd:ee:06' })
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p1')
  })

  it('matches destination.client_macs by MAC', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'aa:bb:cc:dd:ee:01' })
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p2')
  })

  it('returns empty array when no rules match', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'ff:ff:ff:ff:ff:ff' })
    expect(result).toHaveLength(0)
  })

  it('is case-insensitive for MAC comparison', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'AA:BB:CC:DD:EE:06' })
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p1')
  })
})

describe('getRulesForDevice — legacy fields', () => {
  it('matches srcMac by MAC', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'aa:bb:cc:dd:ee:01' })
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p4')
  })

  it('matches srcAddress by exact IP', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'xx:xx:xx:xx:xx:xx', ip: '192.168.1.102' })
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p5')
  })

  it('matches both srcMac and srcAddress when both fit the device', () => {
    const mixed: FirewallPolicy[] = [
      { _id: 'q1', name: 'By MAC', enabled: true, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
      { _id: 'q2', name: 'By IP',  enabled: true, srcAddress: '192.168.1.101'  } as FirewallPolicy,
    ]
    const result = getRulesForDevice(mixed, { mac: 'aa:bb:cc:dd:ee:01', ip: '192.168.1.101' })
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no rules match', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'ff:ff:ff:ff:ff:ff', ip: '10.0.0.1' })
    expect(result).toHaveLength(0)
  })

  it('skips IP matching when device has no IP', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'xx:xx:xx:xx:xx:xx', ip: null })
    expect(result).toHaveLength(0)
  })
})

describe('getRulesForDevice — mixed ZBF + legacy policies', () => {
  it('matches ZBF policy for one device and legacy policy for another from the same list', () => {
    const policies: FirewallPolicy[] = [
      { _id: 'z1', name: 'ZBF rule',    enabled: true,  source: { client_macs: ['aa:bb:cc:dd:ee:06'] } },
      { _id: 'l1', name: 'Legacy rule', enabled: false, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
      { _id: 'u1', name: 'Unrelated',   enabled: true },
    ]
    const zbf = getRulesForDevice(policies, { mac: 'aa:bb:cc:dd:ee:06' })
    expect(zbf).toHaveLength(1)
    expect(zbf[0]._id).toBe('z1')

    const legacy = getRulesForDevice(policies, { mac: 'aa:bb:cc:dd:ee:01' })
    expect(legacy).toHaveLength(1)
    expect(legacy[0]._id).toBe('l1')
  })
})
