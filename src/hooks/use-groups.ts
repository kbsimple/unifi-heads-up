'use client'

import { useCallback } from 'react'
import { useLocalStorage } from './use-local-storage'
import type { DeviceGroup } from '@/lib/types/group'

// Re-export for consumers
export type { DeviceGroup }

const STORAGE_KEY = 'unifi-device-groups'

interface UseGroupsReturn {
  groups: DeviceGroup[]
  createGroup: (name: string) => string
  addGroupDevice: (groupId: string, deviceId: string) => void
  removeGroupDevice: (groupId: string, deviceId: string) => void
  deleteGroup: (groupId: string) => void
}

/**
 * CRUD operations for device groups backed by localStorage.
 * Per D-08: Persistence via localStorage.
 * Per GRUP-01 through GRUP-05.
 */
export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useLocalStorage<DeviceGroup[]>(STORAGE_KEY, [])

  const createGroup = useCallback((name: string): string => {
    const newGroup: DeviceGroup = {
      id: crypto.randomUUID(),
      name,
      deviceIds: [],
    }
    setGroups((prev) => [...prev, newGroup])
    return newGroup.id
  }, [setGroups])

  const addGroupDevice = useCallback((groupId: string, deviceId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId && !group.deviceIds.includes(deviceId)
          ? { ...group, deviceIds: [...group.deviceIds, deviceId] }
          : group
      )
    )
  }, [setGroups])

  const removeGroupDevice = useCallback((groupId: string, deviceId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, deviceIds: group.deviceIds.filter((id) => id !== deviceId) }
          : group
      )
    )
  }, [setGroups])

  const deleteGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== groupId))
  }, [setGroups])

  return {
    groups,
    createGroup,
    addGroupDevice,
    removeGroupDevice,
    deleteGroup,
  }
}
