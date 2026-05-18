import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NetworkClient } from '@/lib/unifi/types'

// Build a minimal mock client
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

// Module-level mocks — shared across tests; we reset call counts in beforeEach
vi.mock('@/lib/unifi', () => ({
  getUnifiClients: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  insertSnapshots: vi.fn(),
}))

describe('src/lib/db/recorder.ts', () => {
  beforeEach(() => {
    // Fresh fake timers for each test (clears any intervals from prior tests)
    vi.useFakeTimers()
    // Reset call counts on mocks
    vi.clearAllMocks()
    // Reset module registry so the `started` boolean resets per test
    vi.resetModules()
  })

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers()
  })

  it('calls insertSnapshots with client list after 60 seconds', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots } = await import('@/lib/db')
    const mockGetClients = vi.mocked(getUnifiClients)
    const mockInsert = vi.mocked(insertSnapshots)
    mockGetClients.mockResolvedValue({ clients: [mockClient], timestamp: Date.now() })

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()

    await vi.advanceTimersByTimeAsync(60_000)

    expect(mockGetClients).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledWith([mockClient])
  })

  it('calling startRecorder twice still fires the interval only once per 60s', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots } = await import('@/lib/db')
    const mockGetClients = vi.mocked(getUnifiClients)
    const mockInsert = vi.mocked(insertSnapshots)
    mockGetClients.mockResolvedValue({ clients: [mockClient], timestamp: Date.now() })

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
    startRecorder() // second call should be no-op

    await vi.advanceTimersByTimeAsync(60_000)

    // Only one interval tick, not two
    expect(mockGetClients).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('does not call insertSnapshots when getUnifiClients rejects', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots } = await import('@/lib/db')
    const mockGetClients = vi.mocked(getUnifiClients)
    const mockInsert = vi.mocked(insertSnapshots)
    mockGetClients.mockRejectedValue(new Error('network error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()

    await vi.advanceTimersByTimeAsync(60_000)

    expect(mockInsert).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[recorder] snapshot failed',
      expect.any(Error)
    )
  })

  it('continues firing on subsequent ticks even after an error', async () => {
    const { getUnifiClients } = await import('@/lib/unifi')
    const { insertSnapshots } = await import('@/lib/db')
    const mockGetClients = vi.mocked(getUnifiClients)
    const mockInsert = vi.mocked(insertSnapshots)

    // First tick fails, second succeeds
    mockGetClients
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValue({ clients: [mockClient], timestamp: Date.now() })

    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()

    await vi.advanceTimersByTimeAsync(60_000)  // first tick — fails
    await vi.advanceTimersByTimeAsync(60_000)  // second tick — succeeds

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledWith([mockClient])
  })
})
