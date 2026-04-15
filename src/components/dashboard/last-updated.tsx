'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface LastUpdatedProps {
  date: Date
  isLoading?: boolean
}

export function LastUpdated({ date, isLoading }: LastUpdatedProps) {
  const [relative, setRelative] = useState('')

  useEffect(() => {
    const updateRelative = () => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
      if (seconds < 60) {
        setRelative('just now')
      } else if (seconds < 3600) {
        setRelative(`${Math.floor(seconds / 60)}m ago`)
      } else {
        setRelative(`${Math.floor(seconds / 3600)}h ago`)
      }
    }

    updateRelative()
    const interval = setInterval(updateRelative, 60000)
    return () => clearInterval(interval)
  }, [date])

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
      <span>Last updated: {relative}</span>
    </div>
  )
}