// src/app/(auth)/login/page.tsx
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login } from '@/app/actions/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

// Submit button with loading state
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, {})
  const formRef = useRef<HTMLFormElement>(null)

  // Show error toast when login fails (per D-07)
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state?.error])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1 pb-4">
          {/* Per D-06: App name at top */}
          <CardTitle className="text-2xl font-semibold text-center text-zinc-100">
            Unifi Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-4">
            {/* Username field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-100">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                placeholder="Enter your username"
              />
              {/* Validation error */}
              {state?.errors?.username && (
                <p className="text-sm text-red-400">
                  {state.errors.username[0]}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-100">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                placeholder="Enter your password"
              />
              {/* Validation error */}
              {state?.errors?.password && (
                <p className="text-sm text-red-400">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            {/* Submit button */}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </main>
  )
}