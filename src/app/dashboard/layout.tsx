// src/app/(dashboard)/layout.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const linkClass = (active: boolean) =>
    `text-sm font-medium transition-colors ${
      active ? 'text-sky-600 border-b-2 border-sky-600' : 'text-zinc-400 hover:text-zinc-100'
    }`

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6 min-w-0">
            <h1 className="hidden md:block text-xl font-semibold text-zinc-100 shrink-0">
              Unifi Dashboard
            </h1>
            <nav className="flex items-center gap-4 md:gap-6">
              <Link href="/dashboard" className={linkClass(pathname === '/dashboard')}>
                Dashboard
              </Link>
              <Link href="/dashboard/firewall" className={linkClass(pathname === '/dashboard/firewall')}>
                Firewall
              </Link>
              <Link
                href="/dashboard/insights"
                className={linkClass(
                  pathname === '/dashboard/insights' || pathname.startsWith('/dashboard/insights/')
                )}
              >
                Insights
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
