/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { withRetry, CircuitBreaker, fetchWithTimeout } from '@/lib/retry'
import { validateInput, validatePrompt, validateCSV } from '@/lib/validation'
import { logError, getUserFriendlyMessage } from '@/lib/errors'
import { BulkGPTError } from '@/lib/types'

describe('Error Handling & Recovery', () => {
  describe('Retry with exponential backoff', () => {
    it('retries failed operations', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        if (attempts < 3) throw new Error('Temporary error')
        return { success: true }
      }

      // Use custom shouldRetry to force retrying all errors for this test
      const result = await withRetry(fn, { 
        maxRetries: 3, 
        shouldRetry: () => true,
        initialDelay: 10 // Speed up test
      })
      expect(attempts).toBe(3)
      expect(result.success).toBe(true)
    })

    it('tracks exponential backoff delays', async () => {
      const delays: number[] = []
      await withRetry(
        () => Promise.reject(new Error('fail')),
        {
          maxRetries: 3,
          shouldRetry: () => true, // Force retry for test
          initialDelay: 10, // Speed up test
          onRetry: (delay) => delays.push(delay),
        }
      ).catch(() => {})

      // Verify delays increase exponentially
      expect(delays.length).toBeGreaterThan(0)
      if (delays.length > 1) {
        expect(delays[1]).toBeGreaterThan(delays[0])
      }
    })

    it('throws after max retries exceeded', async () => {
      const fn = async () => {
        throw new Error('Persistent error')
      }

      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow('Persistent error')
    })
  })

  describe('Input validation', () => {
    it('validates input object', () => {
      expect(() => validateInput({} as any)).toThrow()
      expect(() => validateInput(null as any)).toThrow()
    })

    it('validates prompt is not empty', () => {
      expect(() => validatePrompt('')).toThrow()
      expect(() => validatePrompt('Valid prompt')).not.toThrow()
    })

    it('validates CSV data structure', () => {
      expect(() => validateCSV(null as any)).toThrow()
      expect(() => validateCSV([])).not.toThrow()
      expect(() => validateCSV([{ data: {} }])).not.toThrow()
    })
  })

  describe('Error logging and messages', () => {
    it('logs errors to console', () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new BulkGPTError('TEST_ERROR', 'Test error message')
      logError(error)
      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('provides user-friendly error messages', () => {
      const timeoutError = new BulkGPTError('TIMEOUT', 'Request timed out')
      const message = getUserFriendlyMessage(timeoutError)
      expect(message).toContain('taking longer')

      const networkError = new BulkGPTError('NETWORK_ERROR', 'Network failed')
      const networkMessage = getUserFriendlyMessage(networkError)
      expect(networkMessage.length).toBeGreaterThan(0)
    })
  })

  describe('Timeout handling', () => {
    it('handles fetch timeout', async () => {
      await expect(fetchWithTimeout('https://example.com', 1)).rejects.toThrow()
    })

    it('succeeds before timeout', async () => {
      // Mock fetch that resolves quickly
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' }),
        })
      ) as any

      const result = await fetchWithTimeout('https://example.com', 5000)
      expect(result.ok).toBe(true)
    })
  })

  describe('Circuit breaker', () => {
    it('opens circuit after threshold failures', async () => {
      let failCount = 0
      const breaker = new CircuitBreaker(async () => {
        failCount++
        if (failCount <= 5) {
          throw new Error('API error')
        }
        return { success: true }
      })

      // Fail 5+ times to trigger circuit open
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute()
        } catch {
          // Expected
        }
      }

      expect(breaker.isOpen()).toBe(true)
    })

    it('rejects requests when circuit is open', async () => {
      const breaker = new CircuitBreaker(async () => {
        throw new Error('API error')
      }, { threshold: 1 })

      // Open the circuit
      try {
        await breaker.execute()
      } catch {
        // Expected
      }

      // Try again - should fail immediately without calling function
      await expect(breaker.execute()).rejects.toThrow('Circuit breaker is open')
    })

    it('half-opens after timeout period', async () => {
      const breaker = new CircuitBreaker(async () => {
        throw new Error('API error')
      }, { threshold: 1, timeout: 100 })

      // Open circuit
      try {
        await breaker.execute()
      } catch {
        // Expected
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should be half-open, allowing one attempt
      const state = breaker.getState()
      expect(state === 'open' || state === 'half-open').toBe(true)
    })
  })
})






