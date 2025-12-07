/**
 * ABOUTME: Simple shared data table component
 * ABOUTME: Used by both INPUT preview (CSVUploadTab) and RESULTS display (ResultsTable)
 * ABOUTME: Single source of truth for table styling - guaranteed alignment
 */

'use client'

import * as React from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

// Row data with optional status
export interface TableRow {
  id?: string
  data: Record<string, string>
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  outputData?: Record<string, string>
  error?: string
  // Metadata columns (optional, hidden by default)
  input_tokens?: number
  output_tokens?: number
  model?: string
  tools_used?: string[]
}

export interface SimpleDataTableProps {
  columns: string[]
  rows: TableRow[]
  maxRows?: number
  showStatus?: boolean
  showRowNumbers?: boolean
  outputColumns?: string[]
  className?: string
  // Optional: column selection (for INPUT table)
  selectedColumns?: string[]
  onColumnSelect?: (column: string, selected: boolean) => void
  // Optional: column rename (for INPUT table)
  onColumnRename?: (oldName: string, newName: string) => void
  // Metadata columns (for RESULTS table - hidden by default, opt-in)
  showInputTokens?: boolean
  showOutputTokens?: boolean
  showModel?: boolean
  showToolsUsed?: boolean
}

export function SimpleDataTable({
  columns,
  rows,
  maxRows,
  showStatus = false,
  showRowNumbers = false,
  outputColumns = [],
  className,
  selectedColumns,
  onColumnSelect,
  onColumnRename,
  showInputTokens = false,
  showOutputTokens = false,
  showModel = false,
  showToolsUsed = false,
}: SimpleDataTableProps) {
  const rowsToRender = maxRows ? rows.slice(0, maxRows) : rows
  const hasSelection = selectedColumns !== undefined && onColumnSelect !== undefined
  
  // Column rename state
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  
  const handleRenameSubmit = (oldName: string) => {
    if (editValue.trim() && editValue !== oldName && onColumnRename) {
      onColumnRename(oldName, editValue.trim())
      // Update selected columns if the renamed column was selected
      if (selectedColumns?.includes(oldName) && onColumnSelect) {
        onColumnSelect(oldName, false)
        onColumnSelect(editValue.trim(), true)
      }
    }
    setEditingColumn(null)
    setEditValue('')
  }

  return (
    <table className={cn("w-full text-xs table-fixed", className)}>
      {/* Colgroup for stable column widths - prevents layout shifts during loading */}
      <colgroup>
        {showRowNumbers && <col style={{ width: '48px', minWidth: '48px' }} />}
        {showStatus && <col style={{ width: '40px', minWidth: '40px' }} />}
        {columns.map((col) => (
          <col key={`col-${col}`} style={{ minWidth: '120px' }} />
        ))}
        {outputColumns.map((col) => (
          <col key={`col-output-${col}`} style={{ minWidth: '150px' }} />
        ))}
        {showInputTokens && <col style={{ width: '90px', minWidth: '90px' }} />}
        {showOutputTokens && <col style={{ width: '90px', minWidth: '90px' }} />}
        {showModel && <col style={{ width: '120px', minWidth: '120px' }} />}
        {showToolsUsed && <col style={{ width: '100px', minWidth: '100px' }} />}
      </colgroup>
      
      {/* Header */}
      <thead className="bg-background border-b border-border sticky top-0 z-10">
        <tr className="bg-secondary">
          {/* Row number column header */}
          {showRowNumbers && (
            <th className="px-3 py-2.5 text-center text-muted-foreground font-medium bg-secondary">#</th>
          )}
          {/* Status column header */}
          {showStatus && (
            <th className="px-4 py-2.5 text-center bg-secondary" aria-label="Status" />
          )}
          
          {/* Input columns */}
          {columns.map(col => {
            const isSelected = selectedColumns?.includes(col) ?? true
            const isEditing = editingColumn === col
            return (
              <th
                key={col}
                className={cn(
                  "px-4 py-2.5 text-left font-semibold text-muted-foreground tracking-wider whitespace-nowrap overflow-hidden text-ellipsis bg-secondary",
                  !isSelected && "opacity-40"
                )}
              >
                {hasSelection ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onColumnSelect(col, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Toggle ${col} column`}
                    />
                    {isEditing && onColumnRename ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(col)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(col)
                          if (e.key === 'Escape') {
                            setEditingColumn(null)
                            setEditValue('')
                          }
                        }}
                        autoFocus
                        className="bg-background border border-primary/50 rounded px-1.5 py-0.5 text-xs font-normal normal-case w-24 focus:outline-none focus:ring-1 focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className={onColumnRename ? "cursor-pointer hover:text-primary transition-colors" : ""}
                        onDoubleClick={() => {
                          if (onColumnRename) {
                            setEditingColumn(col)
                            setEditValue(col)
                          }
                        }}
                        title={onColumnRename ? "Double-click to rename" : undefined}
                      >
                        {col}
                      </span>
                    )}
                  </div>
                ) : (
                  col
                )}
              </th>
            )
          })}
          
          {/* Output columns */}
          {outputColumns.map((col, idx) => (
            <th
              key={`output-${col}`}
              className={cn(
                "px-4 py-2.5 text-left font-semibold text-muted-foreground tracking-wider whitespace-nowrap overflow-hidden text-ellipsis bg-secondary",
                idx === 0 && "border-l border-primary/30"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" aria-hidden="true" />
                {col}
              </span>
            </th>
          ))}
          
          {/* Metadata columns - opt-in, shown after output */}
          {showInputTokens && (
            <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground tracking-wider whitespace-nowrap bg-secondary border-l border-border/30">
              In Tokens
            </th>
          )}
          {showOutputTokens && (
            <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground tracking-wider whitespace-nowrap bg-secondary">
              Out Tokens
            </th>
          )}
          {showModel && (
            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground tracking-wider whitespace-nowrap bg-secondary">
              Model
            </th>
          )}
          {showToolsUsed && (
            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground tracking-wider whitespace-nowrap bg-secondary">
              Tools
            </th>
          )}
        </tr>
      </thead>

      {/* Body */}
      <tbody className="divide-y divide-border/30">
        {rowsToRender.map((row, i) => (
          <tr key={row.id || i} className="hover:bg-secondary/20 transition-colors">
            {/* Row number cell */}
            {showRowNumbers && (
              <td className="px-3 py-2.5 text-center text-muted-foreground font-medium">
                {i + 1}
              </td>
            )}
            {/* Status cell */}
            {showStatus && (
              <td className="px-4 py-2.5 text-center">
                {row.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 inline" aria-hidden="true" />
                ) : row.status === 'failed' ? (
                  <XCircle className="h-4 w-4 text-red-500 inline" aria-hidden="true" />
                ) : row.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary inline" aria-hidden="true" />
                ) : (
                  // Pending: pulsing circle to indicate waiting
                  <div className="h-4 w-4 rounded-full border-2 border-primary/40 inline-block animate-pulse" aria-hidden="true" />
                )}
              </td>
            )}

            {/* Input data cells */}
            {columns.map(col => {
              const cellValue = row.data[col]
              const isEmpty = !cellValue || !String(cellValue).trim()
              const isSelected = selectedColumns?.includes(col) ?? true
              
              return (
                <td
                  key={col}
                  className={cn(
                    "px-4 py-2.5",
                    !isSelected && "opacity-30",
                    isEmpty ? "text-muted-foreground/50 italic" : "text-foreground"
                  )}
                >
                  {isEmpty ? (
                    <span className="text-muted-foreground/40">—</span>
                  ) : (
                    <span className="block max-w-[300px] truncate" title={cellValue}>
                      {cellValue}
                    </span>
                  )}
                </td>
              )
            })}

            {/* Output data cells */}
            {outputColumns.map((col, idx) => {
              const cellValue = row.outputData?.[col] || ''
              const isEmpty = !cellValue || !String(cellValue).trim()
              const isError = row.status === 'failed' && row.error
              const isPending = row.status === 'pending' || row.status === 'processing'
              
              return (
                <td
                  key={`output-${col}`}
                  className={cn(
                    "px-4 py-2.5 bg-primary/5",
                    idx === 0 && "border-l border-primary/30",
                    isEmpty && !isPending ? "text-muted-foreground/50 italic" : "text-foreground"
                  )}
                >
                  {isError && idx === 0 ? (
                    <span className="text-red-500 truncate block max-w-[300px]" title={row.error}>
                      {row.error}
                    </span>
                  ) : isPending && isEmpty ? (
                    // Shimmer loading animation for pending cells
                    <div className="relative h-4 w-24 bg-muted/30 rounded overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                    </div>
                  ) : isEmpty ? (
                    <span className="text-muted-foreground/40">—</span>
                  ) : (
                    <span className="block max-w-[300px] truncate" title={cellValue}>
                      {cellValue}
                    </span>
                  )}
                </td>
              )
            })}
            
            {/* Metadata cells */}
            {showInputTokens && (
              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground bg-muted/30 border-l border-border/30">
                {row.input_tokens?.toLocaleString() || '—'}
              </td>
            )}
            {showOutputTokens && (
              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground bg-muted/30">
                {row.output_tokens?.toLocaleString() || '—'}
              </td>
            )}
            {showModel && (
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground bg-muted/30 max-w-[150px] truncate">
                {row.model || '—'}
              </td>
            )}
            {showToolsUsed && (
              <td className="px-4 py-2.5 text-muted-foreground bg-muted/30">
                {row.tools_used && row.tools_used.length > 0 
                  ? row.tools_used.join(', ')
                  : '—'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

