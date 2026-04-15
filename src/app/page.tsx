// src/app/page.tsx
import { redirect } from 'next/navigation'
import { checkAuth } from '@/lib/dal'

/**
 * Root page redirects based on auth status
 * - Authenticated users -> /dashboard
 * - Unauthenticated users -> /login
 */
export default async function HomePage() {
  const { isAuth } = await checkAuth()

  if (isAuth) {
    redirect('/dashboard')
  }

  redirect('/login')
}