import { vi } from 'vitest'
/**
 * Unit tests for useBatchProcessor hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useBatchProcessor } from '../useBatchProcessor'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { ParsedCSV } from '@/lib/types'

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  ANALYTICS_EVENTS: {
    BATCH_STARTED: 'batch_started',
    BATCH_COMPLETED: 'batch_completed',
    BATCH_FAILED: 'batch_failed',
  },
}))

// Mock fetch
global.fetch = vi.fn()

// Mock EventSource
class MockEventSource {
  public url: string
  public listeners: Record<string, Function[]> = {}
  
  constructor(url: string) {
    this.url = url
  }
  
  addEventListener(event: string, handler: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(handler)
  }
  
  close() {
    // Mock close
  }
  
  // Helper to trigger events in tests
  mockEvent(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => handler({ data: JSON.stringify(data) }))
    }
  }
}

global.EventSource = MockEventSource as any

describe('useBatchProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useBatchProcessor())

      expect(result.current.batchId).toBeNull()
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.results).toEqual([])
      expect(result.current.progress).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should provide all expected functions', () => {
      const { result } = renderHook(() => useBatchProcessor())

      expect(typeof result.current.startBatch).toBe('function')
      expect(typeof result.current.cancelBatch).toBe('function')
      expect(typeof result.current.clearResults).toBe('function')
    })
  })

  describe('startBatch', () => {
    const mockCSVData: ParsedCSV = {
      filename: 'test.csv',
      columns: ['name', 'company'],
      rows: [
        { index: 0, data: { name: 'Alice', company: 'Acme' } },
        { index: 1, data: { name: 'Bob', company: 'Tech' } },
      ],
      totalRows: 2,
    }

    it('should start batch processing successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ batchId: 'batch-123' }),
      })

      const { result } = renderHook(() => useBatchProcessor())

      await act(async () => {
        await result.current.startBatch({
          csvData: mockCSVData,
          prompt: 'Test prompt',
          outputColumns: ['bio'],
        })
      })

      expect(result.current.batchId).toBe('batch-123')
      expect(result.current.isProcessing).toBe(true)
      expect(result.current.results).toHaveLength(2)
      expect(result.current.progress).toEqual({
        completed: 0,
        total: 2,
        percentage: 0,
      })
      expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.BATCH_STARTED, expect.any(Object))
    })

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      const { result } = renderHook(() => useBatchProcessor())

      await act(async () => {
        await result.current.startBatch({
          csvData: mockCSVData,
          prompt: 'Test prompt',
          outputColumns: ['bio'],
        })
      })

      expect(result.current.error).toBe('Rate limit exceeded')
      expect(result.current.isProcessing).toBe(false)
      expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.BATCH_FAILED, expect.any(Object))
    })

    it('should include optional parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ batchId: 'batch-456' }),
      })

      const { result } = renderHook(() => useBatchProcessor())

      await act(async () => {
        await result.current.startBatch({
          csvData: mockCSVData,
          prompt: 'Test prompt',
          context: 'Additional context',
          outputColumns: ['bio', 'summary'],
          webhookUrl: 'https://example.com/webhook',
        })
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Additional context'),
      })
    })
  })

  describe('cancelBatch', () => {
    it('should cancel processing and reset state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ batchId: 'batch-789' }),
      })

      const { result } = renderHook(() => useBatchProcessor())

      await act(async () => {
        await result.current.startBatch({
          csvData: {
            filename: 'test.csv',
            columns: ['name'],
            rows: [{ index: 0, data: { name: 'Test' } }],
            totalRows: 1,
          },
          prompt: 'Test',
          outputColumns: ['bio'],
        })
      })

      act(() => {
        result.current.cancelBatch()
      })

      expect(result.current.isProcessing).toBe(false)
      expect(result.current.batchId).toBeNull()
    })
  })

  describe('clearResults', () => {
    it('should clear all results and state', () => {
      const { result } = renderHook(() => useBatchProcessor())

      act(() => {
        result.current.clearResults()
      })

      expect(result.current.results).toEqual([])
      expect(result.current.progress).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.batchId).toBeNull()
    })
  })

  describe('Progress Tracking', () => {
    it('should initialize results with pending status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ batchId: 'batch-progress' }),
      })

      const { result } = renderHook(() => useBatchProcessor())

      await act(async () => {
        await result.current.startBatch({
          csvData: {
            filename: 'test.csv',
            columns: ['name'],
            rows: [
              { index: 0, data: { name: 'User1' } },
              { index: 1, data: { name: 'User2' } },
            ],
            totalRows: 2,
          },
          prompt: 'Test',
          outputColumns: ['bio'],
        })
      })

      expect(result.current.results[0].status).toBe('pending')
      expect(result.current.results[1].status).toBe('pending')
    })
  })

  describe('Type Safety', () => {
    it('should have correct return types', () => {
      const { result } = renderHook(() => useBatchProcessor())

      // Verify structure matches interface
      expect(result.current).toHaveProperty('batchId')
      expect(result.current).toHaveProperty('isProcessing')
      expect(result.current).toHaveProperty('results')
      expect(result.current).toHaveProperty('progress')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('startBatch')
      expect(result.current).toHaveProperty('cancelBatch')
      expect(result.current).toHaveProperty('clearResults')
    })
  })
})
