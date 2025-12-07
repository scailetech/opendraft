/**
 * ABOUTME: Error monitoring service abstraction layer
 * ABOUTME: Provides type-safe interface for error tracking with Sentry integration
 */

import type { ErrorContext } from './errors'
import type { User } from '@supabase/supabase-js'

/**
 * Severity levels for error reporting
 * Maps to Sentry severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

/**
 * User context for error reports
 */
export interface UserContext {
  id: string
  email?: string
  username?: string
}

/**
 * Error monitoring service interface
 * Following Dependency Inversion Principle - depend on abstractions not concretions
 */
export interface ErrorMonitoringService {
  /**
   * Capture an exception/error
   */
  captureException(
    error: Error,
    context?: ErrorContext,
    severity?: ErrorSeverity
  ): void

  /**
   * Capture a message (non-error logging)
   */
  captureMessage(
    message: string,
    context?: ErrorContext,
    severity?: ErrorSeverity
  ): void

  /**
   * Set user context for error reports
   */
  setUser(user: UserContext | null): void

  /**
   * Set custom tags for error grouping
   */
  setTag(key: string, value: string): void

  /**
   * Check if monitoring is initialized
   */
  isInitialized(): boolean
}

/**
 * Sentry implementation of error monitoring
 */
class SentryMonitoringService implements ErrorMonitoringService {
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    // Sentry is initialized via Next.js instrumentation
    // We just check if it's available
    if (typeof window !== 'undefined') {
      const win = window as Window & {
        Sentry?: unknown
      }
      this.initialized = !!win.Sentry
    } else if (typeof global !== 'undefined') {
      const glob = global as typeof globalThis & {
        Sentry?: unknown
      }
      this.initialized = !!glob.Sentry
    }
  }

  captureException(
    error: Error,
    context?: ErrorContext,
    severity: ErrorSeverity = 'error'
  ): void {
    if (!this.initialized) return

    try {
      // Dynamic import to avoid bundling Sentry in environments where it's not needed
      if (typeof window !== 'undefined') {
        const win = window as Window & {
          Sentry?: {
            captureException: (
              error: Error,
              options?: {
                level?: ErrorSeverity
                contexts?: Record<string, unknown>
                extra?: ErrorContext
              }
            ) => void
          }
        }
        win.Sentry?.captureException(error, {
          level: severity,
          extra: context,
          contexts: context
            ? {
                custom: context,
              }
            : undefined,
        })
      } else {
        // Server-side
        const glob = global as typeof globalThis & {
          Sentry?: {
            captureException: (
              error: Error,
              options?: {
                level?: ErrorSeverity
                contexts?: Record<string, unknown>
                extra?: ErrorContext
              }
            ) => void
          }
        }
        glob.Sentry?.captureException(error, {
          level: severity,
          extra: context,
          contexts: context
            ? {
                custom: context,
              }
            : undefined,
        })
      }
    } catch (err) {
      // Silently fail - we don't want monitoring to break the app
      console.error('[MONITORING] Failed to capture exception:', err)
    }
  }

  captureMessage(
    message: string,
    context?: ErrorContext,
    severity: ErrorSeverity = 'info'
  ): void {
    if (!this.initialized) return

    try {
      if (typeof window !== 'undefined') {
        const win = window as Window & {
          Sentry?: {
            captureMessage: (
              message: string,
              options?: {
                level?: ErrorSeverity
                extra?: ErrorContext
              }
            ) => void
          }
        }
        win.Sentry?.captureMessage(message, {
          level: severity,
          extra: context,
        })
      } else {
        const glob = global as typeof globalThis & {
          Sentry?: {
            captureMessage: (
              message: string,
              options?: {
                level?: ErrorSeverity
                extra?: ErrorContext
              }
            ) => void
          }
        }
        glob.Sentry?.captureMessage(message, {
          level: severity,
          extra: context,
        })
      }
    } catch (err) {
      console.error('[MONITORING] Failed to capture message:', err)
    }
  }

  setUser(user: UserContext | null): void {
    if (!this.initialized) return

    try {
      if (typeof window !== 'undefined') {
        const win = window as Window & {
          Sentry?: {
            setUser: (user: UserContext | null) => void
          }
        }
        win.Sentry?.setUser(user)
      } else {
        const glob = global as typeof globalThis & {
          Sentry?: {
            setUser: (user: UserContext | null) => void
          }
        }
        glob.Sentry?.setUser(user)
      }
    } catch (err) {
      console.error('[MONITORING] Failed to set user:', err)
    }
  }

  setTag(key: string, value: string): void {
    if (!this.initialized) return

    try {
      if (typeof window !== 'undefined') {
        const win = window as Window & {
          Sentry?: {
            setTag: (key: string, value: string) => void
          }
        }
        win.Sentry?.setTag(key, value)
      } else {
        const glob = global as typeof globalThis & {
          Sentry?: {
            setTag: (key: string, value: string) => void
          }
        }
        glob.Sentry?.setTag(key, value)
      }
    } catch (err) {
      console.error('[MONITORING] Failed to set tag:', err)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

/**
 * Console fallback implementation
 * Used when Sentry is not configured or in development
 */
class ConsoleMonitoringService implements ErrorMonitoringService {
  private userContext: UserContext | null = null
  private tags: Record<string, string> = {}

  captureException(
    error: Error,
    context?: ErrorContext,
    severity: ErrorSeverity = 'error'
  ): void {
    const prefix = severity === 'fatal' ? '[FATAL]' : `[${severity.toUpperCase()}]`
    console.error(`${prefix} Exception:`, error)
    if (context) {
      console.error('Context:', context)
    }
    if (this.userContext) {
      console.error('User:', this.userContext)
    }
    if (Object.keys(this.tags).length > 0) {
      console.error('Tags:', this.tags)
    }
  }

  captureMessage(
    message: string,
    context?: ErrorContext,
    severity: ErrorSeverity = 'info'
  ): void {
    const logMethod =
      severity === 'error' || severity === 'fatal'
        ? console.error
        : severity === 'warning'
          ? console.warn
          : console.log

    logMethod(`[${severity.toUpperCase()}]`, message)
    if (context) {
      logMethod('Context:', context)
    }
  }

  setUser(user: UserContext | null): void {
    this.userContext = user
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value
  }

  isInitialized(): boolean {
    return true // Console is always available
  }
}

/**
 * Factory function to get the appropriate monitoring service
 * Following Factory Pattern for object creation
 */
function createMonitoringService(): ErrorMonitoringService {
  // Check if Sentry DSN is configured
  const hasSentryDSN =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_SENTRY_DSN

  // In production with Sentry configured, use Sentry
  // Otherwise, fall back to console logging
  if (
    hasSentryDSN &&
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'production'
  ) {
    return new SentryMonitoringService()
  }

  return new ConsoleMonitoringService()
}

/**
 * Singleton instance of monitoring service
 * Initialized once and reused throughout the application
 */
let monitoringServiceInstance: ErrorMonitoringService | null = null

/**
 * Get the monitoring service instance
 * Creates it on first call, then returns the same instance
 */
export function getMonitoringService(): ErrorMonitoringService {
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = createMonitoringService()
  }
  return monitoringServiceInstance
}

/**
 * Helper to convert Supabase User to UserContext
 */
export function userToContext(user: User | null): UserContext | null {
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username as string | undefined,
  }
}

/**
 * Convenience function to capture an exception
 * Uses the singleton monitoring service
 */
export function captureException(
  error: Error,
  context?: ErrorContext,
  severity?: ErrorSeverity
): void {
  getMonitoringService().captureException(error, context, severity)
}

/**
 * Convenience function to capture a message
 * Uses the singleton monitoring service
 */
export function captureMessage(
  message: string,
  context?: ErrorContext,
  severity?: ErrorSeverity
): void {
  getMonitoringService().captureMessage(message, context, severity)
}

/**
 * Convenience function to set user context
 * Uses the singleton monitoring service
 */
export function setUser(user: UserContext | null): void {
  getMonitoringService().setUser(user)
}

/**
 * Convenience function to set a tag
 * Uses the singleton monitoring service
 */
export function setTag(key: string, value: string): void {
  getMonitoringService().setTag(key, value)
}
