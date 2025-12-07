/**
 * Data Input Component
 * Simplified CSV upload interface (tabs removed for cleaner UX)
 */

import { memo } from 'react'
import { CSVUploadTab } from './CSVUploadTab'
import type { ParsedCSV } from '@/lib/types'

interface DataInputTabsProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  isParsing?: boolean
  onFileUpload: (file: File) => void
  onClearData?: () => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
  onColumnRename?: (oldName: string, newName: string) => void
}

export const DataInputTabs = memo(function DataInputTabs({
  csvData,
  fileName,
  isUploading,
  isParsing = false,
  onFileUpload,
  selectedInputColumns,
  onInputColumnsChange,
  onColumnRename
}: DataInputTabsProps) {
  // Show preview if data exists and not currently uploading/parsing
  const showPreview = csvData && csvData.rows.length > 0 && !isUploading && !isParsing

  return (
    <div className="w-full">
      <CSVUploadTab
        csvData={showPreview ? csvData : null}
        fileName={fileName}
        isUploading={isUploading || isParsing}
        onFileUpload={onFileUpload}
        selectedInputColumns={selectedInputColumns}
        onInputColumnsChange={onInputColumnsChange}
        onColumnRename={onColumnRename}
      />
    </div>
  )
})
