/**
 * Context Files Tab Component
 * Allows selecting CSV files that were uploaded in the Context → Files tab
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, CheckCircle } from 'lucide-react'
import { useContextFiles, type ContextFile } from '@/hooks/useContextFiles'
import { parseCSV } from '@/lib/csv-parser'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { AutoSkeleton } from '@/components/ui/auto-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { ParsedCSV } from '@/lib/types'

interface ContextFilesTabProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onFileSelected: (data: ParsedCSV, fileName: string) => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export function ContextFilesTab({
  csvData,
  fileName,
  isUploading,
  onFileSelected,
  selectedInputColumns,
  onInputColumnsChange
}: ContextFilesTabProps) {
  const { files, isLoading, refreshFiles } = useContextFiles()
  const [loadingFile, setLoadingFile] = useState<string | null>(null)

  // Filter to only CSV files
  const csvFiles = files.filter(file => 
    file.type === 'text/csv' || 
    file.name.toLowerCase().endsWith('.csv') ||
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.name.toLowerCase().endsWith('.xls')
  )

  useEffect(() => {
    refreshFiles()
  }, [refreshFiles])

  const handleSelectFile = useCallback(async (file: ContextFile) => {
    if (loadingFile) return

    setLoadingFile(file.id)
    try {
      // Download file from Supabase storage
      const response = await fetch(`/api/context-files/download?path=${encodeURIComponent(file.path)}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to download file' }))
        throw new Error(errorData.error || `Failed to download file: ${response.statusText}`)
      }

      // Get file as blob
      const blob = await response.blob()
      
      // Create File object from blob
      const fileObj = new File([blob], file.name, { type: file.type || 'text/csv' })
      
      // Parse CSV
      const parsed = await parseCSV(fileObj)
      
      if (!parsed) {
        throw new Error('Failed to parse CSV file')
      }

      // Notify parent component
      onFileSelected(parsed, file.name)
      
      toast.success(`Loaded ${file.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load file')
    } finally {
      setLoadingFile(null)
    }
  }, [onFileSelected, loadingFile])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      {csvData && fileName && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium">{fileName}</span>
            <span className="text-xs text-muted-foreground">
              ({csvData.totalRows} rows • {csvData.columns.length} columns)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshFiles()}
            className="text-xs"
          >
            Select different file
          </Button>
        </div>
      )}

      {csvData && csvData.rows.length > 0 && !isUploading ? (
        // Show CSV Preview when file is loaded and has data
        <div className="border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="text-xs text-foreground font-medium">{fileName || 'data.csv'}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {csvData.totalRows} rows • {csvData.columns.length} columns
            </span>
          </div>
          <div className="overflow-x-auto max-h-[120px] overflow-y-auto -mx-1 sm:mx-0">
            <div className="min-w-full inline-block">
              <table className="w-full text-xs min-w-[500px] sm:min-w-0">
                <thead className="sticky top-0 bg-secondary/40 border-b border-border/50">
                  <tr>
                    {csvData.columns.map(col => {
                      const isSelected = selectedInputColumns?.includes(col) ?? true
                      return (
                        <th key={col} className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (!onInputColumnsChange || !csvData) return
                                const newSelection = checked
                                  ? [...(selectedInputColumns || csvData.columns), col]
                                  : (selectedInputColumns || csvData.columns).filter(c => c !== col)
                                onInputColumnsChange(newSelection)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Toggle ${col} column`}
                            />
                            <span className={!isSelected ? 'opacity-50' : ''}>{col}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
              <tbody>
                {csvData.rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'}`}
                    >
                      {csvData.columns.map(col => {
                        const isSelected = selectedInputColumns?.includes(col) ?? true
                        const cellValue = row.data[col]
                        const isEmpty = !cellValue || !cellValue.trim()
                        return (
                          <td 
                            key={col} 
                            className={`px-2 py-1.5 sm:py-1 font-mono text-xs whitespace-nowrap ${
                              !isSelected ? 'opacity-30' : isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
                            }`}
                          >
                            {isEmpty ? (
                              <span className="italic" aria-label="Empty cell">(empty)</span>
                            ) : (
                              <span className="block max-w-[200px] sm:max-w-none truncate sm:whitespace-normal" title={cellValue}>
                                {cellValue}
                              </span>
                            )}
                          </td>
                        )
                        })}
                      </tr>
                    ))}
              </tbody>
            </table>
            </div>
          </div>
          {csvData.totalRows > 5 && (
            <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground bg-muted/20">
              Showing first 5 of {csvData.totalRows} rows
            </div>
          )}
        </div>
      ) : (
        // Show file list when no file selected
        <div className="space-y-2">
          {csvFiles.length === 0 ? (
            <AutoSkeleton isLoading={isLoading}>
              <div className="space-y-2">
                <div className="p-3 border border-border rounded-md bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-3 w-32 rounded" />
                      <div className="h-2 w-24 rounded" />
                    </div>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-md bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-3 w-32 rounded" />
                      <div className="h-2 w-24 rounded" />
                    </div>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-md bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-3 w-32 rounded" />
                      <div className="h-2 w-24 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </AutoSkeleton>
          ) : csvFiles.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Select a CSV file from your uploaded context files:
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {csvFiles.map((file) => {
                  const isSelected = fileName === file.name && csvData !== null
                  const isLoading = loadingFile === file.id

                  return (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      disabled={isLoading}
                      className={`w-full text-left p-3 border rounded-md transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/20'
                      } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isLoading ? (
                            <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                          ) : isSelected ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="No CSV files uploaded yet"
              description="Upload CSV files in the Context → Files tab to use them here. These files can be reused across multiple jobs."
              action={{
                label: 'Go to Context Files',
                onClick: () => {
                  // Switch to context tab - this is handled by parent component
                  const contextTab = document.querySelector('[value="context"]') as HTMLElement
                  if (contextTab) contextTab.click()
                },
                variant: 'outline',
              }}
              size="sm"
              className="border border-dashed border-border rounded-md"
            />
          )}
        </div>
      )}
    </div>
  )
}

