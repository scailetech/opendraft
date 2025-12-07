/**
 * ABOUTME: File upload section with drag-and-drop, CSV preview, and error handling
 * ABOUTME: Manages dropzone state and displays uploaded CSV data in a preview table
 */

import { forwardRef, useRef, useImperativeHandle } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, FileSpreadsheet } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FileUploadSectionProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onFileUpload: (file: File) => void
  onGoogleSheetsUpload?: () => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export const FileUploadSection = forwardRef<HTMLInputElement, FileUploadSectionProps>(function FileUploadSection({
  csvData,
  fileName,
  isUploading,
  onFileUpload,
  onGoogleSheetsUpload,
  selectedInputColumns,
  onInputColumnsChange
}, forwardedRef) {
  const localRef = useRef<HTMLInputElement>(null)

  // Merge local ref with forwarded ref
  useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement)

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) onFileUpload(acceptedFiles[0])
    },
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    noClick: false,
    noKeyboard: false,
  })

  // Errors are handled at parent level (BulkProcessor), not displayed here

  return (
    <div className="space-y-3">
      {csvData && (
        <div className="group flex items-center justify-end gap-2">
          {onGoogleSheetsUpload && (
            <Button
              variant="brand"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onGoogleSheetsUpload()
              }}
              title="Import from Google Sheets"
              aria-label="Import from Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              Google Sheets
            </Button>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant="ghost"
                  size="icon"
            onClick={() => localRef.current?.click()}
            aria-label="Upload a different CSV file"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-8 w-8"
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

      {csvData && !isUploading ? (
        // Show CSV Preview when file is loaded
        <>
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">{fileName || 'data.csv'}</span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid="row-count-display">
                {csvData.totalRows} rows • {csvData.columns.length} columns
              </span>
            </div>
            <div className="overflow-x-auto max-h-[120px] overflow-y-auto">
              <table className="w-full text-xs">
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
                        return (
                          <td 
                            key={col} 
                            className={`px-2 py-1 text-foreground font-mono text-xs whitespace-nowrap ${
                              !isSelected ? 'opacity-30' : ''
                            }`}
                          >
                            {row.data[col] || '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.totalRows > 5 && (
              <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground bg-muted/20">
                Showing first 5 of {csvData.totalRows} rows
              </div>
            )}
          </div>
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
        </>
      ) : (
        // Show Upload Dropzone when no file or uploading
        <div
          {...getRootProps()}
          className={`border border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragReject
              ? 'border-destructive bg-destructive/5'
              : isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30 bg-transparent'
          }`}
        >
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <Upload className={`h-5 w-5 ${isDragReject ? 'text-destructive' : isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-center">
                {isDragReject ? (
                  <p className="text-xs text-destructive font-medium">Invalid file type or size</p>
                ) : isDragActive ? (
                  <p className="text-xs text-primary font-medium">Drop CSV file here</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Drag & drop CSV file or</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Max 10MB • .csv files only</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    localRef.current?.click()
                  }}
                  aria-label="Browse for CSV file to upload"
                >
                  Browse Files
                </Button>
                {onGoogleSheetsUpload && (
                  <Button
                    variant="brand"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onGoogleSheetsUpload()
                    }}
                    aria-label="Import from Google Sheets"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Google Sheets
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload feedback */}
      {/* Errors are displayed at the top level in BulkProcessor, not here */}
    </div>
  )
})
