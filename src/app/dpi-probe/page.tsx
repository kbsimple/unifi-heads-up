'use client'
import { useState } from 'react'

export default function DpiProbePage() {
  const [mac, setMac] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!mac.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/dpi/probe?mac=${encodeURIComponent(mac.trim())}`)
      const data = await res.json() as unknown
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-xl font-semibold text-zinc-100 mb-1">DPI Probe</h1>
        <p className="text-zinc-500 text-sm mb-6">
          Diagnostic tool — validate UniFi Deep Packet Inspection API on real hardware.
          Requires DPI enabled in Settings &rarr; Traffic Management &rarr; Deep Packet Inspection.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={mac}
            onChange={(e) => setMac(e.target.value)}
            placeholder="aa:bb:cc:dd:ee:01"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            aria-label="MAC address"
          />
          <button
            type="submit"
            disabled={loading || !mac.trim()}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 text-sm rounded transition-colors"
          >
            {loading ? 'Probing...' : 'Probe'}
          </button>
        </form>

        {error && (
          <div className="bg-red-950 border border-red-900 rounded p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result !== null && (
          <pre className="bg-zinc-900 border border-zinc-800 rounded p-4 text-zinc-300 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        <p className="text-zinc-600 text-xs mt-4 text-center">
          <a href="/dashboard" className="hover:text-zinc-400 transition-colors">
            &larr; Dashboard
          </a>
        </p>
      </div>
    </div>
  )
}
