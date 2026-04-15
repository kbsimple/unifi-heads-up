// src/app/actions/auth.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { encrypt, createSessionCookieOptions } from '@/lib/session'
import { LoginSchema, type ActionResult, getErrorMessage } from '@/lib/definitions'

/**
 * Login Server Action
 * Per D-01: Separate dashboard auth (independent of UniFi)
 * Per D-02: Credentials from env vars (ADMIN_USER, ADMIN_PASSWORD, FAMILY_USER, FAMILY_PASSWORD)
 * Per D-08: Structured error messages
 */
export async function login(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 1. Validate input with Zod
  const validatedFields = LoginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { username, password } = validatedFields.data

  // 2. Check credentials against env vars (per D-02)
  // Passwords in env are bcrypt hashes
  const adminUser = process.env.ADMIN_USER
  const adminPassword = process.env.ADMIN_PASSWORD
  const familyUser = process.env.FAMILY_USER
  const familyPassword = process.env.FAMILY_PASSWORD

  let isValid = false
  let matchedUsername = ''

  // Check admin credentials
  if (username === adminUser && adminPassword) {
    isValid = await bcrypt.compare(password, adminPassword)
    matchedUsername = 'admin'
  }

  // Check family credentials if admin didn't match
  if (!isValid && username === familyUser && familyPassword) {
    isValid = await bcrypt.compare(password, familyPassword)
    matchedUsername = 'family'
  }

  if (!isValid) {
    // Per D-08: Structured error messages
    return {
      error: getErrorMessage('INVALID_CREDENTIALS'),
    }
  }

  // 3. Create session with 7-day expiration (per D-03)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({
    username: matchedUsername,
    expiresAt,
  })

  // 4. Set HTTP-only cookie
  const cookieStore = await cookies()
  cookieStore.set('session', session, createSessionCookieOptions(expiresAt))

  // 5. Redirect to dashboard
  redirect('/dashboard')
}

/**
 * Logout Server Action
 * Per AUTH-03: User can log out from any page
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}