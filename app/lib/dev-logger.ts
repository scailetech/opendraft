/**
 * Development-only logger utility
 * Console statements only execute in development environment
 * In production, these are no-ops for better performance and security
 */

/* eslint-disable no-console */
// Console usage is intentional here - this file wraps console for environment-aware logging

const isDevelopment = process.env.NODE_ENV === 'development'

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data)
    }
  },

  group: (label: string) => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },
}

/**
 * NOTE: For error logging, use logError() from @/lib/errors
 * This file only contains development-only console wrappers (devLog)
 * Error handling is centralized in lib/errors.ts to follow DRY principle
 */
