'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-zinc-100">
          <p className="text-lg font-semibold text-red-400">Something went wrong</p>
          <p className="max-w-md text-center text-sm text-zinc-400">
            The page encountered an error. Refresh to try again.
          </p>
          {this.state.error && (
            <pre className="mt-2 max-w-xl overflow-auto rounded bg-zinc-900 p-4 text-xs text-zinc-300">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
