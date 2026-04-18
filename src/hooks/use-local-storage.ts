'use client'

import { useState, useEffect } from 'react'

/**
 * Generic localStorage hook with SSR safety and error handling.
 * Returns [storedValue, setValue] tuple.
 * setValue accepts a direct value or an updater function (like useState).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // SSR safety: during server render window is not available
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.error(`useLocalStorage: failed to read key "${key}"`, error)
      return initialValue
    }
  })

  // Sync to localStorage whenever value changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`useLocalStorage: failed to write key "${key}"`, error)
    }
  }, [key, storedValue])

  const setValue = (value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = typeof value === 'function'
        ? (value as (prev: T) => T)(prev)
        : value
      return nextValue
    })
  }

  return [storedValue, setValue]
}
