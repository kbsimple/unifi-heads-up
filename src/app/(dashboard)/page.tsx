// src/app/(dashboard)/page.tsx
import { verifySession } from '@/lib/dal'

/**
 * Dashboard placeholder page
 * Phase 2 will add device list and traffic monitoring
 */
export default async function DashboardPage() {
  // Verify session (redirects to login if not authenticated)
  const { username } = await verifySession()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-zinc-100">
        Welcome, {username}
      </h2>
      <p className="text-zinc-400">
        Dashboard content will be added in Phase 2 (Device List & Traffic Monitoring).
      </p>
      <div className="mt-8 p-8 rounded-lg bg-zinc-900 border border-zinc-800">
        <p className="text-zinc-500 text-center">
          Device list and traffic monitoring coming soon...
        </p>
      </div>
    </div>
  )
}