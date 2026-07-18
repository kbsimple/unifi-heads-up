import { describe, it, expect } from 'vitest'
import { decodeAppId } from './lookup'

describe('decodeAppId — compound ID formula', () => {
  it('applies formula (cat<<16)+app correctly for YouTube', () => {
    // (4 << 16) + 112 = 262256
    expect(decodeAppId(4, 112).compoundId).toBe(262256)
    expect(decodeAppId(4, 112).compoundId).toBe((4 << 16) + 112)
  })

  it('applies formula (cat<<16)+app correctly for cat=1, app=2', () => {
    // (1 << 16) + 2 = 65538
    expect(decodeAppId(1, 2).compoundId).toBe(65538)
    expect(decodeAppId(1, 2).compoundId).toBe((1 << 16) + 2)
  })

  it('decodes YouTube (cat=4, app=112) → appName "Youtube"', () => {
    const result = decodeAppId(4, 112)
    expect(result.appName).toBe('Youtube')
    expect(result.catName).toBe('Media streaming services')
  })

  it('decodes Netflix (cat=4, app=132) → appName "Netflix"', () => {
    // compound: (4 << 16) + 132 = 262276 — verified from ubntwiki cat_app_json
    const result = decodeAppId(4, 132)
    expect(result.appName).toBe('Netflix')
    expect(result.catName).toBe('Media streaming services')
  })

  it('decodes Slack (cat=0, app=39) → appName "Slack"', () => {
    // compound: (0 << 16) + 39 = 39
    const result = decodeAppId(0, 39)
    expect(result.appName).toBe('Slack')
    expect(result.catName).toBe('Instant messengers')
  })

  it('decodes BitTorrent (cat=1, app=2) → appName "BitTorrent Series"', () => {
    const result = decodeAppId(1, 2)
    expect(result.appName).toBe('BitTorrent Series')
    expect(result.catName).toBe('Peer-to-peer networks')
  })

  it('returns fallback strings for an unknown compound ID', () => {
    const result = decodeAppId(99, 9999)
    const expectedCompound = (99 << 16) + 9999
    expect(result.appName).toBe(`App ${expectedCompound}`)
    expect(result.catName).toBe('Category 99')
    expect(result.compoundId).toBe(expectedCompound)
  })

  it('decodes cat=0 apps with compoundId equal to app number', () => {
    // cat=0, any app → compoundId = (0 << 16) + app = app
    expect(decodeAppId(0, 1).appName).toBe('MSN')
    expect(decodeAppId(0, 41).appName).toBe('WhatsApp')
  })
})
