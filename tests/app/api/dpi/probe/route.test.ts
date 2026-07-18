import { describe, it, expect, vi, beforeEach } from 'vitest'

// Declare mocks before imports
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/dpi/probe', () => ({
  probeDpi: vi.fn(),
  probeDpiMock: vi.fn(),
}))
vi.mock('server-only', () => ({}))

import { GET } from '@/app/api/dpi/probe/route'
import { getSession } from '@/lib/session'
import { probeDpi, probeDpiMock } from '@/lib/dpi/probe'

const VALID_SESSION = { username: 'admin', expiresAt: new Date(Date.now() + 86400000) }

describe('GET /api/dpi/probe', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.UNIFI_MOCK
  })

  it('returns 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/dpi/probe?mac=aa:bb:cc:dd:ee:01')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('returns 400 when mac query param is missing', async () => {
    vi.mocked(getSession).mockResolvedValue(VALID_SESSION)
    const req = new Request('http://localhost/api/dpi/probe')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('mac query param required')
  })

  it('calls probeDpiMock and returns 200 when UNIFI_MOCK=true', async () => {
    process.env.UNIFI_MOCK = 'true'
    vi.mocked(getSession).mockResolvedValue(VALID_SESSION)
    vi.mocked(probeDpiMock).mockReturnValue({
      status: 'ok',
      raw: {},
      decoded: [],
      mock: true,
    })
    const req = new Request('http://localhost/api/dpi/probe?mac=aa:bb:cc:dd:ee:01')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.mock).toBe(true)
    expect(probeDpiMock).toHaveBeenCalledWith(['aa:bb:cc:dd:ee:01'])
    expect(probeDpi).not.toHaveBeenCalled()
  })

  it('calls probeDpi with the mac param when not in mock mode', async () => {
    vi.mocked(getSession).mockResolvedValue(VALID_SESSION)
    vi.mocked(probeDpi).mockResolvedValue({ status: 'ok', raw: {}, decoded: [] })
    const req = new Request('http://localhost/api/dpi/probe?mac=aa:bb:cc:dd:ee:01')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(probeDpi).toHaveBeenCalledWith(['aa:bb:cc:dd:ee:01'])
    expect(probeDpiMock).not.toHaveBeenCalled()
  })

  it('returns JSON body from probeDpi result', async () => {
    vi.mocked(getSession).mockResolvedValue(VALID_SESSION)
    vi.mocked(probeDpi).mockResolvedValue({
      status: 'dpi_disabled',
      raw: { meta: { rc: 'ok' }, data: [{}] },
      decoded: [],
    })
    const req = new Request('http://localhost/api/dpi/probe?mac=aa:bb:cc:dd:ee:01')
    const res = await GET(req)
    const data = await res.json()
    expect(data.status).toBe('dpi_disabled')
    expect(data.decoded).toEqual([])
  })

  it('passes the exact mac string from query param to probeDpi', async () => {
    vi.mocked(getSession).mockResolvedValue(VALID_SESSION)
    vi.mocked(probeDpi).mockResolvedValue({ status: 'ok', raw: {}, decoded: [] })
    const req = new Request('http://localhost/api/dpi/probe?mac=ff:ee:dd:cc:bb:aa')
    await GET(req)
    expect(probeDpi).toHaveBeenCalledWith(['ff:ee:dd:cc:bb:aa'])
  })
})
