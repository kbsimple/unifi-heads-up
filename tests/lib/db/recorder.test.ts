import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NetworkClient } from '@/lib/unifi/types'

const mockClient: NetworkClient = {
  id: 'c1',
  mac: 'aa:bb:cc:dd:ee:ff',
  displayName: 'Test Device',
  ip: '192.168.1.1',
  lastSeen: new Date(),
  isWired: false,
  isGuest: false,
  downloadRate: 500,
  uploadRate: 250,
  signal: null,
  trafficStatus: 'low',
}

vi.mock('@/lib/unifi', () => ({
  getUnifiClients: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  insertSnapshots: vi.fn(),
  upsertLatestClients: vi.fn(),
  getRecentAvgRates: vi.fn(),
}))

describe('src/lib/db/recorder.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls insertSnapshots and upsertLatestClients after 60 seconds', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots, upsertLatestClients, getRecentAvgRates } = await import('@/lib/db')
    vi.mocked(getUnifiClients).mockResolvedValue({ clients: [mockClient], timestamp: Date.now() })
    vi.mocked(getRecentAvgRates).mockReturnValue(new Map())

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(vi.mocked(insertSnapshots)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(insertSnapshots)).toHaveBeenCalledWith([mockClient])
    expect(vi.mocked(upsertLatestClients)).toHaveBeenCalledTimes(1)
  })

  it('re-classifies trafficStatus using averaged rates from getRecentAvgRates', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { upsertLatestClients, getRecentAvgRates } = await import('@/lib/db')

    // Client reports 'idle' instant rate, but averaged rates put it in 'high'
    const idleClient: NetworkClient = { ...mockClient, trafficStatus: 'idle', downloadRate: 100, uploadRate: 50 }
    vi.mocked(getUnifiClients).mockResolvedValue({ clients: [idleClient], timestamp: Date.now() })

    // avgDownload + avgUpload = 250_000 + 125_000 = 375_000 bytes/s → 3 Mbps → 'high'
    vi.mocked(getRecentAvgRates).mockReturnValue(
      new Map([['aa:bb:cc:dd:ee:ff', { avgDownload: 250_000, avgUpload: 125_000 }]])
    )

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    await vi.advanceTimersByTimeAsync(60_000)

    const [smoothed] = vi.mocked(upsertLatestClients).mock.calls[0] as [NetworkClient[]]
    expect(smoothed[0].trafficStatus).toBe('high')
  })

  it('falls back to instant trafficStatus when getRecentAvgRates has no entry for the client', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { upsertLatestClients, getRecentAvgRates } = await import('@/lib/db')

    const client: NetworkClient = { ...mockClient, trafficStatus: 'medium' }
    vi.mocked(getUnifiClients).mockResolvedValue({ clients: [client], timestamp: Date.now() })
    // Empty map — no averaged rates available (e.g. brand-new client, no snapshots yet)
    vi.mocked(getRecentAvgRates).mockReturnValue(new Map())

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    await vi.advanceTimersByTimeAsync(60_000)

    const [smoothed] = vi.mocked(upsertLatestClients).mock.calls[0] as [NetworkClient[]]
    expect(smoothed[0].trafficStatus).toBe('medium')
  })

  it('calling startRecorder twice still fires the interval only once per 60s', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots, getRecentAvgRates } = await import('@/lib/db')
    vi.mocked(getUnifiClients).mockResolvedValue({ clients: [mockClient], timestamp: Date.now() })
    vi.mocked(getRecentAvgRates).mockReturnValue(new Map())

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    startRecorder()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(vi.mocked(insertSnapshots)).toHaveBeenCalledTimes(1)
  })

  it('does not call insertSnapshots or upsertLatestClients when getUnifiClients rejects', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots, upsertLatestClients } = await import('@/lib/db')
    vi.mocked(getUnifiClients).mockRejectedValue(new Error('network error'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(vi.mocked(insertSnapshots)).not.toHaveBeenCalled()
    expect(vi.mocked(upsertLatestClients)).not.toHaveBeenCalled()
  })

  it('continues firing on subsequent ticks even after an error', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots, getRecentAvgRates } = await import('@/lib/db')
    vi.mocked(getUnifiClients)
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValue({ clients: [mockClient], timestamp: Date.now() })
    vi.mocked(getRecentAvgRates).mockReturnValue(new Map())
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    await vi.advanceTimersByTimeAsync(60_000) // fails
    await vi.advanceTimersByTimeAsync(60_000) // succeeds

    expect(vi.mocked(insertSnapshots)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(insertSnapshots)).toHaveBeenCalledWith([mockClient])
  })
})
