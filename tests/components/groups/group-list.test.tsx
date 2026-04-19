import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupList } from '@/components/groups/group-list'
import type { ClientsResponse } from '@/lib/unifi/types'

vi.mock('swr', () => ({
  default: vi.fn((_key: string, _fetcher: unknown, config: { fallbackData?: unknown }) => ({
    data: config?.fallbackData,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })),
}))

// Stub localStorage — Vitest 4.x jsdom does not provide a real Storage implementation
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

const mockInitial: ClientsResponse = {
  clients: [
    {
      id: 'c-1', mac: 'AA:BB:CC:DD:EE:01', displayName: 'Kid Laptop', ip: '192.168.1.10',
      lastSeen: new Date('2026-04-18T00:00:00Z'), isWired: false, isGuest: false,
      downloadRate: 600_000, uploadRate: 0, trafficStatus: 'medium',
    },
    {
      id: 'c-2', mac: 'AA:BB:CC:DD:EE:02', displayName: 'Kid Tablet', ip: '192.168.1.11',
      lastSeen: new Date('2026-04-18T00:00:00Z'), isWired: false, isGuest: false,
      downloadRate: 500_000, uploadRate: 0, trafficStatus: 'medium',
    },
  ],
  timestamp: Date.now(),
}

describe('GroupList create-group flow (UAT-04-02)', () => {
  beforeEach(() => localStorageMock.clear())

  it('shows empty state when no groups exist', () => {
    render(<GroupList initialDevices={mockInitial} />)
    expect(screen.getByText(/No groups created yet/i)).toBeInTheDocument()
  })

  it('creates a group, renders GroupCard with aggregated High badge, and persists to localStorage', () => {
    render(<GroupList initialDevices={mockInitial} />)

    // Open the modal — trigger button labeled "Create Group"
    const buttons = screen.getAllByRole('button', { name: /Create Group/i })
    fireEvent.click(buttons[0])

    // Fill group name — input has id="group-name-input", label "Group Name"
    const nameInput = screen.getByLabelText(/Group Name/i)
    fireEvent.change(nameInput, { target: { value: 'Kids Devices' } })

    // Select both devices — base-ui Checkbox renders as role="checkbox" with accessible name
    // from aria-labelledby pointing to the wrapping <label>'s text
    fireEvent.click(screen.getByRole('checkbox', { name: 'Kid Laptop' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Kid Tablet' }))

    // Submit — there are now two "Create Group" buttons (trigger + submit); click the last one
    const allCreateButtons = screen.getAllByRole('button', { name: /Create Group/i })
    fireEvent.click(allCreateButtons[allCreateButtons.length - 1])

    // GroupCard appears with the group name
    expect(screen.getByText('Kids Devices')).toBeInTheDocument()
    // Combined rate 1.1MB/s → aggregated 'High'
    expect(screen.getByText('High')).toBeInTheDocument()

    // Persistence verified
    const stored = JSON.parse(localStorageMock.getItem('unifi-device-groups')!)
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('Kids Devices')
    expect(stored[0].deviceIds).toEqual(expect.arrayContaining(['c-1', 'c-2']))
  })
})
