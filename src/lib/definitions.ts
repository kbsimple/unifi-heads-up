// src/lib/definitions.ts
import { z } from 'zod'

// Session payload stored in JWT
export type SessionPayload = {
  username: string
  expiresAt: Date
}

// Server Action result type
export type ActionResult = {
  error?: string
  errors?: {
    username?: string[]
    password?: string[]
  }
  success?: boolean
}

// Login form validation schema
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Error code to message mapping (per D-08: structured error messages)
export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  NETWORK_ERROR: 'Unable to connect. Please check your connection and try again.',
  UNAUTHORIZED: 'You must be signed in to access this page.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
} as const

// Helper to get error message
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN
}