import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGroups } from '@/hooks/use-groups'

const STORAGE_KEY = 'unifi-device-groups'

// Vitest 4.x jsdom does not provide a real Storage implementation for localStorage.
// Stub it with an in-memory map that matches the Storage interface.
function makeLocalStorageStub() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

const localStorageMock = makeLocalStorageStub()

vi.stubGlobal('localStorage', localStorageMock)

describe('useGroups (UAT-04-01, UAT-04-03)', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('persists new group and devices to localStorage (UAT-04-01)', () => {
    const { result } = renderHook(() => useGroups())
    let newId = ''
    act(() => {
      newId = result.current.createGroup('Kids Devices')
    })
    act(() => {
      result.current.addGroupDevice(newId, 'device-1')
    })
    const raw = localStorageMock.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw!)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ name: 'Kids Devices', deviceIds: ['device-1'] })
  })

  it('re-reads groups on remount, simulating page refresh (UAT-04-01)', () => {
    // Seed storage as if a previous session persisted
    const seed = [{ id: 'g-1', name: 'Kids Devices', deviceIds: ['device-1'] }]
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(seed))

    const { result } = renderHook(() => useGroups())
    expect(result.current.groups).toHaveLength(1)
    expect(result.current.groups[0].name).toBe('Kids Devices')
    expect(result.current.groups[0].deviceIds).toEqual(['device-1'])
  })

  it('removeGroupDevice updates state and localStorage (UAT-04-03)', () => {
    const seed = [{ id: 'g-1', name: 'Kids Devices', deviceIds: ['device-1', 'device-2'] }]
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(seed))

    const { result } = renderHook(() => useGroups())
    expect(result.current.groups[0].deviceIds).toHaveLength(2)

    act(() => {
      result.current.removeGroupDevice('g-1', 'device-1')
    })

    expect(result.current.groups[0].deviceIds).toEqual(['device-2'])
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)
    expect(stored[0].deviceIds).toEqual(['device-2'])
  })

  it('createGroup returns the new group id', () => {
    const { result } = renderHook(() => useGroups())
    let newId = ''
    act(() => {
      newId = result.current.createGroup('Test')
    })
    expect(typeof newId).toBe('string')
    expect(newId.length).toBeGreaterThan(0)
    expect(result.current.groups.find((g) => g.id === newId)).toBeDefined()
  })
})
