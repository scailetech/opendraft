/**
 * Integration test for useFileUpload hook
 * Tests actual File objects and localStorage
 */

import { renderHook, act } from '@testing-library/react'
import { useFileUpload } from '../useFileUpload'

describe('useFileUpload Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should handle real CSV file upload', async () => {
    const { result } = renderHook(() => useFileUpload())
    
    // Create real File object
    const csvContent = 'name,email\nJohn,john@test.com'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    await act(async () => {
      await result.current.uploadFile(file)
    })
    
    expect(result.current.file).toBe(file)
    expect(result.current.error).toBeNull()
  })

  it('should persist recent files to localStorage', () => {
    const { result } = renderHook(() => useFileUpload())
    const file = new File(['content'], 'test.csv', { type: 'text/csv' })
    
    act(() => {
      result.current.addToRecent(file, 100)
    })
    
    // Check localStorage
    const stored = localStorage.getItem('bulk-gpt-recent-files')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed[0].name).toBe('test.csv')
    expect(parsed[0].rowCount).toBe(100)
  })
})
