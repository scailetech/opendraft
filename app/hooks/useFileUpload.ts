/**
 * V2 Hook: File Upload Management
 * 
 * Extracted from BulkProcessor.tsx to follow Single Responsibility Principle
 * Handles all file upload logic including validation, recent files, and state
 * 
 * @example
 * const { file, error, uploadFile, clearFile, recentFiles } = useFileUpload()
 * 
 * // Upload a file
 * await uploadFile(csvFile)
 * 
 * // Clear current file
 * clearFile()
 */

import { useState, useCallback, useEffect } from 'react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { devLog } from '@/lib/dev-logger'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const RECENT_FILES_KEY = 'bulk-gpt-recent-files'
const MAX_RECENT_FILES = 5

export interface RecentFile {
  name: string
  timestamp: number
  rowCount: number
}

export interface UseFileUploadReturn {
  file: File | null
  error: string | null
  isUploading: boolean
  recentFiles: RecentFile[]
  
  uploadFile: (file: File) => Promise<void>
  clearFile: () => void
  clearError: () => void
  addToRecent: (file: File, rowCount: number) => void
}

/**
 * Custom hook for managing file uploads with validation and recent files
 */
export function useFileUpload(): UseFileUploadReturn {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  // Load recent files from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_FILES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentFile[]
        setRecentFiles(parsed)
      }
    } catch (e) {
      devLog.warn('Failed to load recent files from localStorage:', e)
    }
  }, [])

  // Validate file before upload
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!file.name.endsWith('.csv')) {
      return {
        valid: false,
        error: 'Only CSV files are accepted'
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    // Check if empty
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty'
      }
    }

    return { valid: true }
  }, [])

  // Upload file with validation
  const uploadFile = useCallback(async (file: File): Promise<void> => {
    setError(null)
    setIsUploading(true)

    try {
      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error!)
        
        // Track validation error
        trackEvent(ANALYTICS_EVENTS.FILE_PARSE_ERROR, {
          fileName: file.name,
          fileSize: file.size,
          error: validation.error,
          stage: 'validation',
        })
        
        return
      }

      // Set file (parsing happens in parent component)
      setFile(file)

      // Track successful upload
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: file.name,
        fileSize: file.size,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file'
      setError(errorMessage)
      
      trackEvent(ANALYTICS_EVENTS.FILE_PARSE_ERROR, {
        fileName: file.name,
        fileSize: file.size,
        error: errorMessage,
        stage: 'upload',
      })
    } finally {
      setIsUploading(false)
    }
  }, [validateFile])

  // Add file to recent files list
  const addToRecent = useCallback((file: File, rowCount: number) => {
    const recent: RecentFile = {
      name: file.name,
      timestamp: Date.now(),
      rowCount,
    }

    setRecentFiles(prevFiles => {
      // Add to beginning, remove duplicates, limit to MAX_RECENT_FILES
      const updated = [
        recent,
        ...prevFiles.filter(f => f.name !== file.name)
      ].slice(0, MAX_RECENT_FILES)

      // Persist to localStorage
      try {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated))
      } catch (e) {
        devLog.warn('Failed to save recent files to localStorage:', e)
      }

      return updated
    })
  }, [])

  // Clear current file
  const clearFile = useCallback(() => {
    setFile(null)
    setError(null)
  }, [])

  // Clear error only
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    file,
    error,
    isUploading,
    recentFiles,
    uploadFile,
    clearFile,
    clearError,
    addToRecent,
  }
}




