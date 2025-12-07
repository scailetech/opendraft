/**
 * ABOUTME: Visual progress indicator for bulk processor workflow
 * ABOUTME: Shows 3 steps with conditional icons and colors based on completion state
 */

import { CheckCircle } from 'lucide-react'

interface WorkflowStepsProps {
  hasCSV: boolean
  hasPrompt: boolean
  isProcessing: boolean
  hasResults: boolean
}

export function WorkflowSteps({
  hasCSV,
  hasPrompt,
  isProcessing,
  hasResults
}: WorkflowStepsProps) {
  return (
    <div className="space-y-1">
      {/* Step 1: Upload CSV */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 ${hasCSV ? 'text-green-400' : 'text-primary'}`}>
          {hasCSV ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-current" />
          )}
          <span className="text-xs font-medium">1. Upload CSV</span>
        </div>
        <div className="flex-1 h-px bg-accent" />
      </div>

      {/* Step 2: Configure Prompt */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 ${hasCSV && hasPrompt ? 'text-green-400' : hasCSV ? 'text-primary' : 'text-muted-foreground'}`}>
          {hasCSV && hasPrompt ? (
            <CheckCircle className="h-4 w-4" />
          ) : hasCSV ? (
            <div className="h-4 w-4 rounded-full border-2 border-current flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-current" />
            </div>
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-current" />
          )}
          <span className="text-xs font-medium">2. Configure Prompt</span>
        </div>
        <div className="flex-1 h-px bg-accent" />
      </div>

      {/* Step 3: Process Data */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 ${isProcessing ? 'text-primary' : hasResults ? 'text-green-400' : 'text-muted-foreground'}`}>
          {isProcessing ? (
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : hasResults ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-current" />
          )}
          <span className="text-xs font-medium">3. Process Data</span>
        </div>
        <div className="flex-1 h-px bg-accent" />
      </div>
    </div>
  )
}
