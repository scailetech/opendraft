'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportResult {
  id: string
  input: string | Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

interface ExportButtonProps {
  results: ExportResult[]
  batchId?: string
  disabled?: boolean
  onExporting?: (isExporting: boolean) => void
}

export function ExportButton({
  results,
  batchId,
  disabled = false,
  onExporting,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setError(null)
      setIsExporting(true)
      onExporting?.(true)

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results,
          format,
          batchId,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Export failed with status ${response.status}`)
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get('content-disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `results.${format}`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during export'
      setError(message)
      console.error('[EXPORT_ERROR]', err)
    } finally {
      setIsExporting(false)
      onExporting?.(false)
    }
  }

  const isDisabled = disabled || results.length === 0 || isExporting

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isDisabled}
            className="gap-2"
            title={results.length === 0 ? 'No results to export' : undefined}
          >
            {isExporting ? (
              <>
                🏃 Exporting...
              </>
            ) : (
              <>
                🏁 Export Results
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('json')}
            disabled={isExporting}
          >
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}






