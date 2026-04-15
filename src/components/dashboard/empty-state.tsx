// src/components/dashboard/empty-state.tsx
import { WifiOff } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <WifiOff className="h-8 w-8 text-zinc-500 mb-4" />
      <h3 className="text-lg font-medium text-zinc-100 mb-2">
        No devices found
      </h3>
      <p className="text-sm text-zinc-400 max-w-md">
        Your network may be empty, or there was an issue loading devices.
      </p>
    </div>
  )
}