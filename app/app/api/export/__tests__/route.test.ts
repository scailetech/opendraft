import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Type for mock request objects
interface MockRequest extends Partial<NextRequest> {
  json: () => Promise<{
    results: Array<{ id: string; input: string; output: string; status: 'success' | 'error' }>
    format: 'csv' | 'json' | 'excel'
    batchId?: string
  }>
}

describe('POST /api/export', () => {
  const mockResults = [
    { id: '1', input: 'Test', output: 'Result', status: 'success' as const },
    { id: '2', input: 'Jane', output: 'Result2', status: 'error' as const },
  ]

  describe('CSV export', () => {
    it('exports results to CSV format', async () => {
      const mockRequest: MockRequest = {
        json: async () => ({
          results: mockResults,
          format: 'csv',
          batchId: 'batch-123',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(response.headers.get('content-disposition')).toContain('attachment')
    })

    it('sets correct filename for CSV', async () => {
      const mockRequest: MockRequest = {
        json: async () => ({
          results: mockResults,
          format: 'csv',
          batchId: 'test-batch',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      const disposition = response.headers.get('content-disposition')
      expect(disposition).toContain('test-batch')
      expect(disposition).toContain('.csv')
    })
  })

  describe('JSON export', () => {
    it('exports results to JSON format', async () => {
      const mockRequest = {
        json: async () => ({
          results: mockResults,
          format: 'json',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/json')
    })

    it('sets correct filename for JSON', async () => {
      const mockRequest = {
        json: async () => ({
          results: mockResults,
          format: 'json',
          batchId: 'test-batch',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      const disposition = response.headers.get('content-disposition')
      expect(disposition).toContain('test-batch')
      expect(disposition).toContain('.json')
    })
  })

  describe('validation', () => {
    it('returns 400 if results is missing', async () => {
      const mockRequest = {
        json: async () => ({
          format: 'csv',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(400)
    })

    it('returns 400 if format is invalid', async () => {
      const mockRequest = {
        json: async () => ({
          results: mockResults,
          format: 'xml',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(400)
    })

    it('returns 400 if results is not an array', async () => {
      const mockRequest = {
        json: async () => ({
          results: { data: 'not array' },
          format: 'csv',
        }),
      }

      const response = await POST(mockRequest as NextRequest)
      expect(response.status).toBe(400)
    })
  })
})






