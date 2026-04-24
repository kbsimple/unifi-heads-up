// src/app/(dashboard)/layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'

/**
 * Dashboard layout with navigation bar
 * Per D-01, D-02: Three navigation tabs (Dashboard, Firewall, Groups)
 * Per D-02: Active tab has sky-600 accent color
 * Per D-09: Top navigation bar with app name left, logout right
 * Per D-10: Simple layout for future dashboard content
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation bar - 64px height per UI-SPEC */}
      <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between">
        {/* App name and navigation tabs - left aligned */}
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-zinc-100">
            Unifi Dashboard
          </h1>
          {/* Navigation tabs - per D-01, D-02: Dashboard, Firewall, Groups */}
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/firewall"
              className={`text-sm font-medium transition-colors ${
                pathname === '/dashboard/firewall'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Firewall
            </Link>
            <Link
              href="/dashboard/groups"
              className={`text-sm font-medium transition-colors ${
                pathname === '/dashboard/groups'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Groups
            </Link>
          </nav>
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