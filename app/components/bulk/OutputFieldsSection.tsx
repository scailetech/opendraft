'use client'

/**
 * ABOUTME: Output fields management section for bulk processor
 * ABOUTME: Handles adding/removing output column names with validation and help tooltip
 */

import React, { memo } from 'react'
import { HelpCircle, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OutputFieldsSectionProps {
  outputFields: string[]
  newField: string
  onNewFieldChange: (value: string) => void
  onAddField: () => void
  onRemoveField: (field: string) => void
}

export const OutputFieldsSection = memo(function OutputFieldsSection({
  outputFields,
  newField,
  onNewFieldChange,
  onAddField,
  onRemoveField
}: OutputFieldsSectionProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-3">
        {/* Header with inline help */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Output Fields</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Learn about output fields"
              >
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1.5 text-xs">
                <p className="font-medium">Output Fields</p>
                <p className="text-muted-foreground">
                  Column names for your exported CSV. Use AI optimization (✨) for best results - it defines exact output formats.
                </p>
                <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                  <strong>Tip:</strong> AI optimization specifies formats like &quot;Numeric value only&quot; or &quot;One sentence summary&quot; to ensure consistent output.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Inline input with existing fields */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Existing fields as chips */}
          {outputFields.map(field => (
            <div 
              key={field} 
              className="inline-flex items-center gap-1 px-2 py-1 bg-secondary/60 border border-border/50 rounded text-xs text-foreground font-mono"
            >
              <span>{field}</span>
              <button
                onClick={() => onRemoveField(field)}
                className="text-muted-foreground hover:text-red-400 transition-colors"
                aria-label={`Remove ${field}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {/* Compact inline input */}
          <div className="inline-flex items-center">
            <input
              value={newField}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50)
                onNewFieldChange(sanitized)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (newField.trim() && !outputFields.includes(newField.trim())) {
                    onAddField()
                  }
                }
              }}
              placeholder="field_name"
              maxLength={50}
              className={cn(
                "w-28 px-2 py-1 bg-transparent border-b border-border/50 text-xs font-mono",
                "focus:outline-none focus:border-primary",
                "placeholder:text-muted-foreground/40",
                outputFields.includes(newField.trim()) && "border-red-500/50"
              )}
              aria-label="New output field name"
            />
            <button
              onClick={onAddField}
              disabled={!newField.trim() || outputFields.includes(newField.trim())}
              className="ml-1 p-1 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Add field"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
})
