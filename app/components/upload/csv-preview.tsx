'use client'

import React from 'react'
import type { ParsedCSV } from '@/lib/types'

interface CSVPreviewProps {
  data: ParsedCSV
  maxRows?: number
}

export function CSVPreview({ data, maxRows = 5 }: CSVPreviewProps): React.ReactElement {
  const previewRows = data.rows.slice(0, maxRows)
  const hasMoreRows = data.rows.length > maxRows

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Preview ({previewRows.length} of {data.totalRows} rows)</p>
        {hasMoreRows && <p className="text-xs text-muted-foreground">Showing first {maxRows} rows</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 border-b border-border/50">
            <tr>
              {data.columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-muted-foreground tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.rowIndex} className="border-b border-border hover:bg-muted/50">
                {data.columns.map((col) => (
                  <td key={`${row.rowIndex}-${col}`} className="whitespace-nowrap px-4 py-2 text-foreground">
                    <span className="inline-block max-w-xs truncate">{row.data[col] || '-'}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}






