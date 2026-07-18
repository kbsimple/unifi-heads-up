import { describe, it, expect } from 'vitest'
import { getRulesForDevice } from './mapping'
import type { FirewallPolicy } from './types'

// NOTE: ZBF field names used here (source.client_macs, destination.client_macs) match
// aiounifi source and community reports but need live-console verification against a
// real UniFi OS 9.0+ device before relying on them in production.

const zbfPolicies: FirewallPolicy[] = [
  { _id: 'p1', name: 'Block Switch', enabled: true,  source: { client_macs: ['aa:bb:cc:dd:ee:06'] } },
  { _id: 'p2', name: 'Block MacBook Dst', enabled: false, destination: { client_macs: ['aa:bb:cc:dd:ee:01'] } },
  { _id: 'p3', name: 'Unrelated',    enabled: true },
]

const legacyPolicies: FirewallPolicy[] = [
  { _id: 'p4', name: 'Block MacBook', enabled: false, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
  { _id: 'p5', name: 'Block by IP',   enabled: true,  srcAddress: '192.168.1.102' } as FirewallPolicy,
  { _id: 'p6', name: 'Unrelated',     enabled: true },
]

describe('getRulesForDevice — ZBF mode', () => {
  it('matches source.client_macs by MAC', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'aa:bb:cc:dd:ee:06' }, true)
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p1')
  })

  it('matches destination.client_macs by MAC', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'aa:bb:cc:dd:ee:01' }, true)
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p2')
  })

  it('returns empty array when no rules match', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'ff:ff:ff:ff:ff:ff' }, true)
    expect(result).toHaveLength(0)
  })

  it('is case-insensitive for MAC comparison', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'AA:BB:CC:DD:EE:06' }, true)
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p1')
  })

  it('does not match srcMac or srcAddress fields (ZBF ignores legacy fields)', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'aa:bb:cc:dd:ee:01' }, true)
    expect(result).toHaveLength(0)
  })
})

describe('getRulesForDevice — legacy mode', () => {
  it('matches srcMac by MAC', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'aa:bb:cc:dd:ee:01' }, false)
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p4')
  })

  it('matches srcAddress by exact IP', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'xx:xx:xx:xx:xx:xx', ip: '192.168.1.102' }, false)
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('p5')
  })

  it('matches both srcMac and srcAddress when both fit the device', () => {
    const mixed: FirewallPolicy[] = [
      { _id: 'q1', name: 'By MAC', enabled: true, srcMac: 'aa:bb:cc:dd:ee:01' } as FirewallPolicy,
      { _id: 'q2', name: 'By IP',  enabled: true, srcAddress: '192.168.1.101'  } as FirewallPolicy,
    ]
    const result = getRulesForDevice(mixed, { mac: 'aa:bb:cc:dd:ee:01', ip: '192.168.1.101' }, false)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no rules match', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'ff:ff:ff:ff:ff:ff', ip: '10.0.0.1' }, false)
    expect(result).toHaveLength(0)
  })

  it('does not match source.client_macs (legacy ignores ZBF fields)', () => {
    const result = getRulesForDevice(zbfPolicies, { mac: 'aa:bb:cc:dd:ee:06' }, false)
    expect(result).toHaveLength(0)
  })

  it('skips IP matching when device has no IP', () => {
    const result = getRulesForDevice(legacyPolicies, { mac: 'xx:xx:xx:xx:xx:xx', ip: null }, false)
    expect(result).toHaveLength(0)
  })
})
