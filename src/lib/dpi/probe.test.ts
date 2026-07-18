import { describe, it, expect } from 'vitest'
import { inferStatus, decodeDpiResponse, probeDpiMock } from './probe'
import type { DpiRawResponse } from './probe'

describe('inferStatus', () => {
  it('returns "dpi_disabled" when data array is empty', () => {
    const raw = { meta: { rc: 'ok' }, data: [] } as DpiRawResponse
    expect(inferStatus(raw)).toBe('dpi_disabled')
  })

  it('returns "dpi_disabled" when data[0] is an empty object (DPI off response)', () => {
    // This is the shape UniFi returns when DPI is disabled in Traffic Management settings
    const raw = { meta: { rc: 'ok' }, data: [{}] } as DpiRawResponse
    expect(inferStatus(raw)).toBe('dpi_disabled')
  })

  it('returns "no_data" when by_app is present but empty', () => {
    const raw: DpiRawResponse = {
      meta: { rc: 'ok' },
      data: [{ mac: 'aa:bb:cc:dd:ee:01', last_updated: 1234567890, by_app: [], by_cat: [] }],
    }
    expect(inferStatus(raw)).toBe('no_data')
  })

  it('returns "ok" when by_app has at least one entry', () => {
    const raw: DpiRawResponse = {
      meta: { rc: 'ok' },
      data: [{
        mac: 'aa:bb:cc:dd:ee:01',
        last_updated: 1234567890,
        by_app: [{ app: 112, cat: 4, rx_bytes: 1000, tx_bytes: 100, rx_packets: 10, tx_packets: 1 }],
        by_cat: [],
      }],
    }
    expect(inferStatus(raw)).toBe('ok')
  })
})

describe('decodeDpiResponse', () => {
  it('returns empty array when data is empty', () => {
    const raw = { meta: { rc: 'ok' }, data: [] } as DpiRawResponse
    expect(decodeDpiResponse(raw)).toEqual([])
  })

  it('decodes YouTube entry with correct appName and compoundId', () => {
    const raw: DpiRawResponse = {
      meta: { rc: 'ok' },
      data: [{
        mac: 'aa:bb:cc:dd:ee:01',
        last_updated: 1234567890,
        by_app: [{ app: 112, cat: 4, rx_bytes: 1500000, tx_bytes: 50000, rx_packets: 1000, tx_packets: 100 }],
        by_cat: [],
      }],
    }
    const decoded = decodeDpiResponse(raw)
    expect(decoded).toHaveLength(1)
    expect(decoded[0].appName).toBe('Youtube')
    expect(decoded[0].catName).toBe('Media streaming services')
    expect(decoded[0].compoundId).toBe(262256)
    expect(decoded[0].rx_bytes).toBe(1500000)
  })
})

describe('probeDpiMock', () => {
  it('returns status "ok" with mock:true', () => {
    const result = probeDpiMock(['aa:bb:cc:dd:ee:01'])
    expect(result.status).toBe('ok')
    expect(result.mock).toBe(true)
  })

  it('decoded array contains Youtube', () => {
    const result = probeDpiMock(['aa:bb:cc:dd:ee:01'])
    const youtube = result.decoded.find((d) => d.appName === 'Youtube')
    expect(youtube).toBeDefined()
    expect(youtube?.compoundId).toBe(262256)
  })

  it('decoded array contains Netflix (compound 262276)', () => {
    const result = probeDpiMock(['aa:bb:cc:dd:ee:01'])
    const netflix = result.decoded.find((d) => d.appName === 'Netflix')
    expect(netflix).toBeDefined()
    expect(netflix?.compoundId).toBe(262276)
  })

  it('decoded array contains Slack', () => {
    const result = probeDpiMock(['aa:bb:cc:dd:ee:01'])
    const slack = result.decoded.find((d) => d.appName === 'Slack')
    expect(slack).toBeDefined()
    expect(slack?.compoundId).toBe(39)
  })

  it('uses provided mac in raw response', () => {
    const result = probeDpiMock(['aa:bb:cc:dd:ee:99'])
    const raw = result.raw as { data: Array<{ mac: string }> }
    expect(raw.data[0].mac).toBe('aa:bb:cc:dd:ee:99')
  })

  it('returns 3 decoded entries (Youtube, Netflix, Slack)', () => {
    const result = probeDpiMock(['aa:bb:cc:dd:ee:01'])
    expect(result.decoded).toHaveLength(3)
  })
})
