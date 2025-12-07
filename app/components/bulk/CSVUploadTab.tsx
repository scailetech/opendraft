/**
 * CSV Upload Tab Component
 * Handles CSV file upload with drag-and-drop and preview
 */

import { forwardRef, useRef, useImperativeHandle, useEffect, useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, Maximize2, X } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SimpleDataTable, type TableRow } from '@/components/ui/simple-data-table'
import { SkeletonLoader } from './SkeletonLoader'

interface CSVUploadTabProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onFileUpload: (file: File) => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
  onColumnRename?: (oldName: string, newName: string) => void
}

export const CSVUploadTab = forwardRef<HTMLInputElement, CSVUploadTabProps>(function CSVUploadTab({
  csvData,
  fileName,
  isUploading,
  onFileUpload,
  selectedInputColumns,
  onInputColumnsChange,
  onColumnRename
}, forwardedRef) {
  const localRef = useRef<HTMLInputElement | null>(null)
  const [showSelectedOnly, setShowSelectedOnly] = useState(false) // Show all columns by default
  const [isPreviewOpen, setIsPreviewOpen] = useState(false) // Full-screen preview modal
  const [warningDismissed, setWarningDismissed] = useState(false) // Dismiss warning banner

  useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement)

  // Reset table state when CSV changes
  useEffect(() => {
    setShowSelectedOnly(false)
    setIsPreviewOpen(false)
    setWarningDismissed(false) // Show warnings again for new file
  }, [csvData])

  // Memoize displayed columns to avoid duplicate filtering logic (DRY)
  const displayedColumns = useMemo(() => {
    if (!csvData) return []
    if (showSelectedOnly && selectedInputColumns && selectedInputColumns.length > 0) {
      return csvData.columns.filter(col => selectedInputColumns.includes(col))
    }
    return csvData.columns
  }, [csvData, showSelectedOnly, selectedInputColumns])

  // Check if "Show selected only" button should be enabled
  const hasSelectedColumns = selectedInputColumns && selectedInputColumns.length > 0

  // Convert CSV data to TableRow format for SimpleDataTable
  const tableRows = useMemo<TableRow[]>(() => {
    if (!csvData) return []
    return csvData.rows.map((row, i) => ({
      id: `row-${i}`,
      data: row.data,
    }))
  }, [csvData])

  // Handle column selection change
  const handleColumnSelect = (column: string, selected: boolean) => {
    if (!onInputColumnsChange || !csvData) return
    const newSelection = selected
      ? [...(selectedInputColumns || csvData.columns), column]
      : (selectedInputColumns || csvData.columns).filter(c => c !== column)
    onInputColumnsChange(newSelection)
  }

  // Handle column rename - also updates selectedInputColumns
  const handleColumnRename = (oldName: string, newName: string) => {
    if (onColumnRename) {
      onColumnRename(oldName, newName)
      // Update selected columns if the renamed column was selected
      if (selectedInputColumns?.includes(oldName) && onInputColumnsChange) {
        const newSelection = selectedInputColumns.map(c => c === oldName ? newName : c)
        onInputColumnsChange(newSelection)
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive, open, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) onFileUpload(acceptedFiles[0])
    },
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
    noClick: false,
    noKeyboard: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  // Get input props - react-dropzone handles the ref internally
  const inputProps = getInputProps()
  
  // Sync our ref with the actual input element using useEffect
  useEffect(() => {
    // Find the input element by data-testid after react-dropzone attaches it
    const input = document.querySelector('[data-testid="file-input"]') as HTMLInputElement | null
    if (input) {
      localRef.current = input
    }
  }, [csvData, isUploading])

  return (
    <div className="space-y-3">
      {csvData && (
        <div className="group flex items-center justify-between gap-3 px-4 pt-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-foreground truncate" title={fileName || 'data.csv'}>
                {fileName || 'data.csv'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {csvData.totalRows} {csvData.totalRows === 1 ? 'row' : 'rows'} • {csvData.columns.length} {csvData.columns.length === 1 ? 'column' : 'columns'}
              </span>
            </div>
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
                  variant="ghost"
                  size="icon"
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
            aria-label="Upload a different CSV file"
                  className="flex-shrink-0 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 h-8 w-8"
          >
                  <Upload className="h-4 w-4" aria-hidden="true" />
          </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Change file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Row limit warning - show when >1000 rows */}
      {csvData && csvData.totalRows > 1000 && (
        <div className="mx-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-sm">⚠️</span>
            <div className="text-xs text-amber-400">
              <p><strong>Row limit:</strong> Only the first 1,000 rows will be processed. Your file has {csvData.totalRows.toLocaleString()} rows.</p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings display (encoding issues, etc.) - dismissible */}
      {csvData?.warnings && csvData.warnings.length > 0 && !warningDismissed && (
        <div className="mx-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-sm">⚠️</span>
            <div className="flex-1 text-xs text-amber-400 space-y-1">
              {csvData.warnings.map((warning, i) => (
                <p key={i}>{warning}</p>
              ))}
            </div>
            <button
              onClick={() => setWarningDismissed(true)}
              className="text-amber-400 hover:text-amber-300 p-0.5 rounded hover:bg-amber-500/20 transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {isUploading ? (
        // Show Skeleton Loader while uploading/parsing
        <SkeletonLoader rows={5} columns={4} />
      ) : csvData && csvData.rows.length > 0 ? (
        // Show CSV Preview when file is loaded and has data
        <>
          <div className="px-4 pb-4">
            <div className="border border-border/60 rounded-lg overflow-hidden bg-background/50 shadow-sm">
              {/* Table Controls */}
              <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between gap-2 bg-secondary/20">
                <button
                  type="button"
                  onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                  disabled={!hasSelectedColumns}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={showSelectedOnly ? 'Switch to showing all columns' : 'Switch to showing selected columns only'}
                >
                  {showSelectedOnly ? 'Showing selected only' : 'Showing all columns'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  aria-label="Open full table preview"
                >
                  <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  <span>Preview</span>
                </button>
              </div>
              {/* Data Preview - using shared SimpleDataTable component */}
              <div className="overflow-x-auto overflow-y-auto max-h-[200px]">
                <div className="min-w-full inline-block">
                  <SimpleDataTable
                    columns={displayedColumns}
                    rows={tableRows}
                    maxRows={5}
                    selectedColumns={selectedInputColumns}
                    onColumnSelect={handleColumnSelect}
                    onColumnRename={onColumnRename ? handleColumnRename : undefined}
                  />
                </div>
              </div>
              {csvData.totalRows > 5 && (
                <div className="px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground bg-secondary/20 text-center">
                  Showing first 5 of {csvData.totalRows} rows
                </div>
              )}
            </div>
          </div>
          
          {/* Full Table Preview Modal */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Table Preview</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto min-h-0">
                <div className="border border-border/60 rounded-lg overflow-hidden bg-background/50">
                  <div className="overflow-x-auto">
                    <SimpleDataTable
                      columns={displayedColumns}
                      rows={tableRows}
                      selectedColumns={selectedInputColumns}
                      onColumnSelect={handleColumnSelect}
                      onColumnRename={onColumnRename ? handleColumnRename : undefined}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <input {...inputProps} className="hidden" data-testid="file-input" />
        </>
      ) : (
        // Show Upload Dropzone when no file and not uploading
        <div
          {...getRootProps()}
          className={`
            group relative rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer
            transition-all duration-200 ease-out
            ${isDragActive
              ? 'border-2 border-solid border-primary bg-primary/5 scale-[1.01]'
              : 'border-2 border-dashed border-green-500/40 hover:border-green-500/60 hover:bg-green-500/5 hover:scale-[1.005]'
            }
          `}
        >
          <input {...inputProps} className="hidden" data-testid="file-input" />
          <div className="flex flex-col items-center gap-3 w-full">
            <div className={`
              p-3 rounded-full transition-all duration-200
              ${isDragActive 
                ? 'bg-primary/10 scale-110' 
                : 'bg-green-500/10 group-hover:bg-green-500/20'
              }
            `}>
              <Upload 
                className={`
                  h-5 w-5 transition-all duration-200
                  ${isDragActive 
                    ? 'text-primary -translate-y-0.5' 
                    : 'text-green-500/70 group-hover:text-green-500'
                  }
                `} 
                aria-hidden="true"
              />
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium transition-colors duration-200 ${isDragActive ? 'text-primary' : 'text-foreground'}`}>
                {isDragActive ? 'Drop to upload' : 'Drop CSV file here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse • Max 10MB
              </p>
            </div>
          </div>
          {fileRejections.length > 0 && (
            <div className="mt-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400">
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name}>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-red-300/60 text-xs mb-1">
                    File size: {(file.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                  {errors.map((e) => (
                    <p key={e.code} className="text-red-300/80">
                      {e.code === 'file-too-large'
                        ? `File too large. Maximum: 10MB`
                        : e.code === 'file-invalid-type'
                        ? 'Only CSV files are accepted'
                        : e.message}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

