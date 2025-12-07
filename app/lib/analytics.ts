/**
 * Production-grade analytics wrapper for tracking user events
 * Integrates with PostHog for production analytics
 * Falls back gracefully when PostHog is not configured
 */

import { devLog } from '@/lib/dev-logger'

interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp?: number
}

interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void
  identify: (userId: string, traits?: Record<string, unknown>) => void
  reset: () => void
}

class Analytics {
  private queue: AnalyticsEvent[] = []
  private isInitialized = false
  private posthog: PostHogInstance | null = null

  async init() {
    if (this.isInitialized) return
    
    // Initialize PostHog if configured
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      try {
        const posthogModule = await import('posthog-js')
        const posthog = posthogModule.default
        
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          // Privacy settings
          autocapture: true,
          capture_pageview: true,
          capture_pageleave: true,
          // Performance
          loaded: (ph) => {
            this.posthog = ph as PostHogInstance
            devLog.log('PostHog initialized')
          },
        })
      } catch (error) {
        // Silently fail if PostHog fails to load (e.g., network issues)
        devLog.log('PostHog initialization failed:', error)
      }
    }
    
    this.isInitialized = true
    await this.flushQueue()
  }

  track(event: string, properties?: Record<string, unknown>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
    }

    if (!this.isInitialized) {
      this.queue.push(analyticsEvent)
      return
    }

    this.sendEvent(analyticsEvent)
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    if (!this.isInitialized) {
      this.init().then(() => {
        this.identify(userId, traits)
      })
      return
    }

    // Identify user in PostHog
    if (this.posthog) {
      this.posthog.identify(userId, traits)
    }
    
    devLog.log('Analytics: Identify user', userId, traits)
  }

  reset() {
    if (this.posthog) {
      this.posthog.reset()
    }
    this.queue = []
  }

  private sendEvent(event: AnalyticsEvent) {
    // Send to PostHog if available
    if (this.posthog) {
      try {
        this.posthog.capture(event.event, {
          ...event.properties,
          timestamp: event.timestamp,
        })
      } catch (error) {
        devLog.log('PostHog capture failed:', error)
      }
    }
    
    // Always log to dev logger for debugging
    devLog.log('Analytics:', event.event, event.properties)
  }

  private async flushQueue() {
    while (this.queue.length > 0) {
      const event = this.queue.shift()
      if (event) {
        this.sendEvent(event)
      }
    }
  }
}

// Singleton instance
export const analytics = new Analytics()

// Convenience functions
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  analytics.track(event, properties)
}

// Common events
export const ANALYTICS_EVENTS = {
  // File events
  FILE_UPLOADED: 'file_uploaded',
  // Agent events
  AGENT_RUN_STARTED: 'agent_run_started',
  AGENT_RUN_COMPLETED: 'agent_run_completed',
  AGENT_RUN_FAILED: 'agent_run_failed',
  FILE_PARSE_ERROR: 'file_parse_error',
  
  // Processing events
  BATCH_STARTED: 'batch_started',
  BATCH_COMPLETED: 'batch_completed',
  BATCH_FAILED: 'batch_failed',
  BATCH_ERROR: 'batch_error',
  BATCH_CANCELLED: 'batch_cancelled',
  BATCH_EXPORTED: 'batch_exported',
  RESULTS_EXPORTED: 'results_exported',
  
  // Rate limit events
  RATE_LIMIT_HIT: 'rate_limit_hit',
  
  // UI events
  BETA_BANNER_DISMISSED: 'beta_banner_dismissed',
  BETA_UPGRADE_CLICKED: 'beta_upgrade_clicked',
  API_TOKEN_REVEALED: 'api_token_revealed',
  BULK_TEMPLATE_USED: 'bulk_template_used',
  JOB_RESET: 'job_reset',

  // Error events
  ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',
  
  // Auth events
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_UP: 'user_signed_up',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
} as const





