'use client'

import React, { useState } from 'react'

interface ProcessButtonProps {
  disabled?: boolean
  onProcess?: () => Promise<void>
  onError?: (error: Error) => void
}

export function ProcessButton({
  disabled = false,
  onProcess,
  onError,
}: ProcessButtonProps): React.ReactElement {
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleProcess = async () => {
    try {
      setIsProcessing(true)
      setHasError(false)
      if (onProcess) {
        await onProcess()
      }
    } catch (error) {
      setHasError(true)
      if (onError && error instanceof Error) {
        onError(error)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleProcess}
        disabled={disabled || isProcessing}
        className={`w-full rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
          disabled || isProcessing
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : hasError
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing...
          </span>
        ) : hasError ? (
          'Retry Processing'
        ) : (
          'Process CSV'
        )}
      </button>
      {hasError && (
        <p className="text-xs text-red-600">
          Processing failed. Click retry to try again.
        </p>
      )}
    </div>
  )
}

