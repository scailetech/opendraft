import { vi, type Mock } from 'vitest'
/**
 * Tests for useCSVParser hook
 * Ensures CSV parsing state management works correctly
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCSVParser } from '../useCSVParser'
import * as csvParser from '@/lib/csv-parser'
import * as analytics from '@/lib/analytics'

// Mock dependencies
vi.mock('@/lib/csv-parser')
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  ANALYTICS_EVENTS: {
    FILE_UPLOADED: 'file_uploaded',
    FILE_PARSE_ERROR: 'file_parse_error',
  },
}))

describe('useCSVParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with null data and no error', () => {
      const { result } = renderHook(() => useCSVParser())
      
      expect(result.current.csvData).toBeNull()
      expect(result.current.isParsing).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Successful Parsing', () => {
    it('should parse CSV file successfully', async () => {
      const mockParsedData = {
        filename: 'test.csv',
        rows: [
          { rowIndex: 0, data: { name: 'John', email: 'john@test.com' } },
        ],
        columns: ['name', 'email'],
        totalRows: 1,
      }

      ;(csvParser.parseCSV as jest.Mock).mockResolvedValue(mockParsedData)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

      let parsedResult
      await act(async () => {
        parsedResult = await result.current.parseFile(file)
      })

      expect(result.current.csvData).toEqual(mockParsedData)
      expect(result.current.isParsing).toBe(false)
      expect(result.current.error).toBeNull()
      expect(parsedResult).toEqual(mockParsedData)
    })

    it('should track analytics on successful parse', async () => {
      const mockParsedData = {
        filename: 'test.csv',
        rows: [],
        columns: ['name'],
        totalRows: 100,
      }

      ;(csvParser.parseCSV as jest.Mock).mockResolvedValue(mockParsedData)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_uploaded',
        expect.objectContaining({
          fileName: 'test.csv',
          rowCount: 100,
          columnCount: 1,
        })
      )
    })

    it('should set isParsing to true during parsing', async () => {
      let resolvePromise: (value: any) => void
      const parsePromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      ;(csvParser.parseCSV as Mock).mockReturnValue(parsePromise)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      let parseFilePromise: Promise<any>
      act(() => {
        parseFilePromise = result.current.parseFile(file)
      })

      // Check isParsing is true during parse
      await waitFor(() => {
        expect(result.current.isParsing).toBe(true)
      })

      // Complete parsing
      act(() => {
        resolvePromise!({
          filename: 'test.csv',
          rows: [],
          columns: [],
          totalRows: 0,
        })
      })

      await parseFilePromise!

      await waitFor(() => {
        expect(result.current.isParsing).toBe(false)
      })
    })
  })

  describe('Parse Errors', () => {
    it('should handle parse errors gracefully', async () => {
      const errorMessage = 'Invalid CSV format'
      ;(csvParser.parseCSV as jest.Mock).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['invalid'], 'test.csv', { type: 'text/csv' })

      let parsedResult
      await act(async () => {
        parsedResult = await result.current.parseFile(file)
      })

      expect(result.current.csvData).toBeNull()
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isParsing).toBe(false)
      expect(parsedResult).toBeNull()
    })

    it('should track analytics on parse error', async () => {
      ;(csvParser.parseCSV as jest.Mock).mockRejectedValue(new Error('Parse failed'))

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_parse_error',
        expect.objectContaining({
          fileName: 'test.csv',
          error: 'Parse failed',
          stage: 'parsing',
        })
      )
    })

    it('should handle non-Error exceptions', async () => {
      ;(csvParser.parseCSV as jest.Mock).mockRejectedValue('String error')

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.error).toBe('Failed to parse CSV')
    })
  })

  describe('State Management', () => {
    it('should clear data and error', async () => {
      const mockParsedData = {
        filename: 'test.csv',
        rows: [],
        columns: [],
        totalRows: 0,
      }

      ;(csvParser.parseCSV as jest.Mock).mockResolvedValue(mockParsedData)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      // Parse file
      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.csvData).not.toBeNull()

      // Clear data
      act(() => {
        result.current.clearData()
      })

      expect(result.current.csvData).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should clear error only', async () => {
      ;(csvParser.parseCSV as jest.Mock).mockRejectedValue(new Error('Error'))

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      // Trigger error
      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.error).not.toBeNull()

      // Clear error only
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should clear previous error on new parse attempt', async () => {
      ;(csvParser.parseCSV as jest.Mock)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          filename: 'test.csv',
          rows: [],
          columns: [],
          totalRows: 0,
        })

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['data'], 'test.csv', { type: 'text/csv' })

      // First parse (error)
      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.error).toBe('First error')

      // Second parse (success)
      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.error).toBeNull()
      expect(result.current.csvData).not.toBeNull()
    })
  })

  describe('Multiple Parse Operations', () => {
    it('should handle sequential parse operations', async () => {
      const mockData1 = {
        filename: 'file1.csv',
        rows: [],
        columns: ['col1'],
        totalRows: 1,
      }
      
      const mockData2 = {
        filename: 'file2.csv',
        rows: [],
        columns: ['col2'],
        totalRows: 2,
      }

      ;(csvParser.parseCSV as jest.Mock)
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result } = renderHook(() => useCSVParser())
      
      const file1 = new File(['data1'], 'file1.csv', { type: 'text/csv' })
      const file2 = new File(['data2'], 'file2.csv', { type: 'text/csv' })

      // Parse first file
      await act(async () => {
        await result.current.parseFile(file1)
      })

      expect(result.current.csvData?.filename).toBe('file1.csv')

      // Parse second file
      await act(async () => {
        await result.current.parseFile(file2)
      })

      expect(result.current.csvData?.filename).toBe('file2.csv')
      expect(csvParser.parseCSV).toHaveBeenCalledTimes(2)
    })
  })
})
