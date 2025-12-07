'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Loader2 } from 'lucide-react'
import { logError as logErrorToService } from '@/lib/errors'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Enable auto-retry with exponential backoff */
  autoRetry?: boolean
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Initial retry delay in milliseconds */
  retryDelay?: number
  /** Custom error message */
  errorMessage?: string
  /** Custom retry label */
  retryLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
  retryTimeoutId: NodeJS.Timeout | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      retryTimeoutId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logErrorToService(error, {
      componentStack: errorInfo.componentStack,
      source: 'ErrorBoundary',
    })

    // Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // Report to Sentry
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        })
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      })

    // Auto-retry if enabled
    if (this.props.autoRetry) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  scheduleRetry = () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      return // Max retries reached
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const delay = retryDelay * Math.pow(2, retryCount)

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry()
    }, delay) as unknown as NodeJS.Timeout
    
    this.setState({ retryTimeoutId: this.retryTimeoutId })
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      return
    }

    this.setState({ 
      isRetrying: true,
      retryCount: retryCount + 1,
    })

    // Reset error state to attempt re-render
    setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        isRetrying: false,
      })
    }, 100)
  }

  handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      retryTimeoutId: null,
    })
  }

  getErrorMessage = (): string => {
    if (this.props.errorMessage) {
      return this.props.errorMessage
    }

    const { error } = this.state
    if (!error) return 'Something went wrong'

    // Provide more helpful error messages based on error type
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. The server may be slow to respond.'
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }

    return error.message || 'An unexpected error occurred'
  }

  render() {
    const { retryCount, isRetrying, hasError } = this.state
    const { maxRetries = 3, retryLabel = 'Try again' } = this.props

    if (isRetrying) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4" role="status" aria-live="polite">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Retrying... ({retryCount}/{maxRetries})
            </p>
          </div>
        </div>
      )
    }

    if (hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      const canRetry = retryCount < maxRetries
      const errorMessage = this.getErrorMessage()

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-secondary border border-border rounded-lg p-6 space-y-4">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center space-y-2">
                <h2 className="text-base font-medium text-foreground">
                  Something went wrong
                </h2>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
                {this.props.autoRetry && retryCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Attempt {retryCount} of {maxRetries}
                  </p>
                )}
              </div>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Error details
                  </summary>
                  <div className="mt-2 p-3 bg-background rounded border border-border">
                    <p className="text-xs font-mono text-red-400 break-all">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    variant="default"
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {retryLabel}
                  </Button>
                )}
                <Button
                  onClick={() => window.location.href = '/'}
                  variant={canRetry ? 'outline' : 'default'}
                  className="flex-1 gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go home
                </Button>
              </div>

              {/* Auto-retry indicator */}
              {this.props.autoRetry && canRetry && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Will automatically retry in a few seconds...
                </p>
              )}
            </div>

            {/* Beta Notice */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              bulk.run is in beta. Thank you for your patience.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logErrorToService(error, {
      componentStack: errorInfo?.componentStack,
      source: 'useErrorHandler',
    })

    // Report to Sentry
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(error, {
          extra: {
            componentStack: errorInfo?.componentStack,
          },
        })
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      })
  }
}

// Specific error boundary for the bulk processor
export function BulkProcessorErrorBoundary({ children }: { children: ReactNode }) {
  const handleError = useErrorHandler()
  
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => handleError(error, errorInfo)}
      autoRetry={false}
      maxRetries={0}
      retryDelay={2000}
      errorMessage="The bulk processor encountered an error. This might be due to network issues, invalid CSV format, or API rate limits."
      retryLabel="Retry Processing"
      fallback={
        <div className="p-6 bg-secondary border border-border rounded-lg">
          <div className="flex items-center gap-3 text-yellow-500 mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Processing Error</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The bulk processor encountered an error. This might be due to:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
            <li>Invalid CSV format</li>
            <li>Network connectivity issues</li>
            <li>API rate limits</li>
            <li>Server processing errors</li>
          </ul>
          <div className="flex gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Processing
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Error boundary for data fetching components (SWR errors)
export function DataErrorBoundary({ 
  children, 
  errorMessage,
  onRetry,
}: { 
  children: ReactNode
  errorMessage?: string
  onRetry?: () => void
}) {
  return (
    <ErrorBoundary
      autoRetry={true}
      maxRetries={2}
      retryDelay={1000}
      errorMessage={errorMessage || 'Failed to load data. Please check your connection and try again.'}
      retryLabel="Reload Data"
      onError={() => {
        // If onRetry callback provided, call it
        if (onRetry) {
          setTimeout(onRetry, 100)
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}






