// src/components/logout-button.tsx
'use client'

import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

/**
 * Logout button component
 * Per AUTH-03: User can log out from any page
 * Per UI-SPEC: "Sign out" copy, ghost variant
 */
export function LogoutButton() {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="ghost"
        className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
      >
        Sign out
      </Button>
    </form>
  )
}