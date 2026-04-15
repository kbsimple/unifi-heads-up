// src/lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'

/**
 * Verify user is authenticated
 * Per D-04: Server-side session validation with server-only guard
 * Returns session info or redirects to login
 */
export const verifySession = cache(async () => {
  const session = await getSession()

  if (!session?.username) {
    redirect('/login')
  }

  return {
    isAuth: true,
    username: session.username,
  }
})

/**
 * Check if user is authenticated without redirecting
 * Useful for conditional rendering in Server Components
 */
export async function checkAuth(): Promise<{ isAuth: boolean; username?: string }> {
  const session = await getSession()

  if (!session?.username) {
    return { isAuth: false }
  }

  return {
    isAuth: true,
    username: session.username,
  }
}