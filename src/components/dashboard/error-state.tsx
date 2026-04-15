// src/components/dashboard/error-state.tsx
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  onRetry: () => void
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="bg-card">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Unable to reach network service</AlertTitle>
      <AlertDescription>
        Please check your connection and try again.
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </AlertAction>
    </Alert>
  )
}