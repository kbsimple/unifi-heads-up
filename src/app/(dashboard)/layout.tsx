// src/app/(dashboard)/layout.tsx
import { LogoutButton } from '@/components/logout-button'

/**
 * Dashboard layout with navigation bar
 * Per D-09: Top navigation bar with app name left, logout right
 * Per D-10: Simple layout for future dashboard content
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation bar - 64px height per UI-SPEC */}
      <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between">
        {/* App name - left aligned */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-zinc-100">
            Unifi Dashboard
          </h1>
        </div>

        {/* Logout button - right aligned */}
        <LogoutButton />
      </header>

      {/* Main content area */}
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}