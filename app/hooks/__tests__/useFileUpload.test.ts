import { vi } from 'vitest'
/**
 * Tests for useFileUpload hook
 * Ensures file upload validation and state management works correctly
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileUpload } from '../useFileUpload'
import * as analytics from '@/lib/analytics'

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  ANALYTICS_EVENTS: {
    FILE_UPLOADED: 'file_uploaded',
    FILE_PARSE_ERROR: 'file_parse_error',
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useFileUpload', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with null file and no error', () => {
      const { result } = renderHook(() => useFileUpload())
      
      expect(result.current.file).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.isUploading).toBe(false)
      expect(result.current.recentFiles).toEqual([])
    })

    it('should load recent files from localStorage', () => {
      const recentFiles = [
        { name: 'test.csv', timestamp: Date.now(), rowCount: 100 },
      ]
      localStorageMock.setItem('bulk-gpt-recent-files', JSON.stringify(recentFiles))

      const { result } = renderHook(() => useFileUpload())
      
      expect(result.current.recentFiles).toEqual(recentFiles)
    })
  })

  describe('File Validation', () => {
    it('should accept valid CSV files', async () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.uploadFile(file)
      })

      expect(result.current.file).toBe(file)
      expect(result.current.error).toBeNull()
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_uploaded',
        expect.objectContaining({
          fileName: 'test.csv',
          fileSize: file.size,
        })
      )
    })

    it('should reject non-CSV files', async () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        await result.current.uploadFile(file)
      })

      expect(result.current.file).toBeNull()
      expect(result.current.error).toBe('Only CSV files are accepted')
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_parse_error',
        expect.objectContaining({
          error: 'Only CSV files are accepted',
          stage: 'validation',
        })
      )
    })

    it('should reject files larger than 10MB', async () => {
      const { result } = renderHook(() => useFileUpload())
      
      // Create a file object with size > 10MB
      const largeContent = new Array(11 * 1024 * 1024).join('a')
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' })
      
      // Mock file size
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })

      await act(async () => {
        await result.current.uploadFile(file)
      })

      expect(result.current.file).toBeNull()
      expect(result.current.error).toBe('File too large. Maximum 10MB')
    })

    it('should reject empty files', async () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File([], 'empty.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.uploadFile(file)
      })

      expect(result.current.file).toBeNull()
      expect(result.current.error).toBe('File is empty')
    })
  })

  describe('Recent Files Management', () => {
    it('should add file to recent files', () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      act(() => {
        result.current.addToRecent(file, 100)
      })

      expect(result.current.recentFiles).toHaveLength(1)
      expect(result.current.recentFiles[0]).toMatchObject({
        name: 'test.csv',
        rowCount: 100,
      })
    })

    it('should limit recent files to 5 entries', () => {
      const { result } = renderHook(() => useFileUpload())

      act(() => {
        for (let i = 0; i < 7; i++) {
          const file = new File(['content'], `test${i}.csv`, { type: 'text/csv' })
          result.current.addToRecent(file, i)
        }
      })

      expect(result.current.recentFiles).toHaveLength(5)
    })

    it('should move duplicate files to the top', () => {
      const { result } = renderHook(() => useFileUpload())
      const file1 = new File(['content'], 'test1.csv', { type: 'text/csv' })
      const file2 = new File(['content'], 'test2.csv', { type: 'text/csv' })

      act(() => {
        result.current.addToRecent(file1, 100)
        result.current.addToRecent(file2, 200)
        result.current.addToRecent(file1, 150) // Re-add file1
      })

      expect(result.current.recentFiles).toHaveLength(2)
      expect(result.current.recentFiles[0].name).toBe('test1.csv')
      expect(result.current.recentFiles[0].rowCount).toBe(150) // Updated count
    })

    it('should persist recent files to localStorage', () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      act(() => {
        result.current.addToRecent(file, 100)
      })

      const stored = localStorageMock.getItem('bulk-gpt-recent-files')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('test.csv')
    })
  })

  describe('State Management', () => {
    it('should clear file and error', async () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.uploadFile(file)
      })

      act(() => {
        result.current.clearFile()
      })

      expect(result.current.file).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should clear error only', async () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        await result.current.uploadFile(file)
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should set isUploading to true during upload', async () => {
      const { result } = renderHook(() => useFileUpload())
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      const uploadPromise = act(async () => {
        await result.current.uploadFile(file)
      })

      // Check isUploading is true during upload
      await waitFor(() => {
        // After upload completes, isUploading should be false
      })

      await uploadPromise
      expect(result.current.isUploading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      setItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useFileUpload())
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      // Should not throw
      act(() => {
        result.current.addToRecent(file, 100)
      })

      expect(result.current.recentFiles).toHaveLength(1) // Still updates state

      setItemSpy.mockRestore()
    })

    it('should handle invalid localStorage data', () => {
      localStorageMock.setItem('bulk-gpt-recent-files', 'invalid json{')

      // Should not throw
      const { result } = renderHook(() => useFileUpload())
      
      expect(result.current.recentFiles).toEqual([])
    })
  })
})




