'use client'

import React, { useState, useCallback, useRef } from 'react'
import { FileUp } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { BulkGPTError } from '@/lib/types'
import { parseCSV } from '@/lib/csv-parser'
import { CSVPreview } from './csv-preview'

interface CSVUploadProps {
  onComplete: (data: ParsedCSV) => void
}

type UploadState = 'idle' | 'uploading' | 'preview' | 'error'

export function CSVUpload({ onComplete }: CSVUploadProps): React.ReactElement {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = useCallback(
    async (file: File) => {
      setState('uploading')
      setError(null)
      try {
        const result = await parseCSV(file)
        setParsedData(result)
        setState('preview')
      } catch (err) {
        if (err instanceof BulkGPTError) {
          setError(err.message)
        } else {
          setError('Failed to parse CSV file. Please try again.')
        }
        setState('error')
      }
    },
    []
  )

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const file = files[0]

      // Validate file type
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('CSV files only. Please select a .csv file.')
        setState('error')
        return
      }

      // Validate file size
      const maxSizeBytes = 50 * 1024 * 1024
      if (file.size > maxSizeBytes) {
        setError(`File too large. Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`)
        setState('error')
        return
      }

      await handleFileProcess(file)
    },
    [handleFileProcess]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleCancel = useCallback(() => {
    setState('idle')
    setParsedData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleConfirm = useCallback(() => {
    if (parsedData) {
      onComplete(parsedData)
      handleCancel()
    }
  }, [parsedData, onComplete, handleCancel])

  // Show preview if data is loaded
  if (state === 'preview' && parsedData) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">File Preview</h3>
          <p className="text-sm text-muted-foreground">{parsedData.filename}</p>
        </div>

        {parsedData.totalRows > 1000 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-400">
              ⚠️ Row limit: Only the first 1,000 rows will be processed. Your file has {parsedData.totalRows.toLocaleString()} rows.
            </p>
          </div>
        )}

        <CSVPreview data={parsedData} />

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Confirm & Proceed
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Show error if any
  if (state === 'error' && error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">❌ {error}</p>
        </div>
        <button
          onClick={handleCancel}
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Show upload zone
  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted'
        } p-8 text-center`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Select CSV file"
        />

        <div className="space-y-3">
          <FileUp className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium text-foreground">Drag and drop your CSV file here</p>
            <p className="text-sm text-muted-foreground">or</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Select CSV File
          </button>
          <p className="text-xs text-muted-foreground">Maximum file size: 50MB | Maximum rows: 1,000</p>
        </div>
      </div>
    </div>
  )
}






