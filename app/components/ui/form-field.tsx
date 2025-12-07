/**
 * FormField Component
 * 
 * Enhanced form field with inline validation feedback.
 * Provides consistent validation UI across the application.
 */

import React, { ReactNode } from 'react'
import { Label } from './label'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface FormFieldProps {
  /** Field label */
  label?: string
  /** Field ID (required for accessibility) */
  id: string
  /** Error message to display */
  error?: string
  /** Success message to display */
  success?: string
  /** Helper text */
  helperText?: string
  /** Whether field is required */
  required?: boolean
  /** Additional className */
  className?: string
  /** Children (Input, Textarea, etc.) */
  children: ReactNode
  /** Show validation icon */
  showValidationIcon?: boolean
}

export function FormField({
  label,
  id,
  error,
  success,
  helperText,
  required,
  className,
  children,
  showValidationIcon = true,
}: FormFieldProps) {
  const hasError = !!error
  const hasSuccess = !!success && !hasError

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={id}
          className={cn(
            'text-xs',
            hasError && 'text-destructive',
            hasSuccess && 'text-green-500'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-invalid': hasError ? 'true' : 'false',
          'aria-describedby': hasError || helperText || hasSuccess
            ? `${id}-${hasError ? 'error' : hasSuccess ? 'success' : 'helper'}`
            : undefined,
          className: cn(
            (children as React.ReactElement).props.className,
            hasError && 'border-destructive focus-visible:ring-destructive',
            hasSuccess && 'border-green-500 focus-visible:ring-green-500'
          ),
        })}
        
        {showValidationIcon && (hasError || hasSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      {(error || success || helperText) && (
        <div
          id={`${id}-${hasError ? 'error' : hasSuccess ? 'success' : 'helper'}`}
          className={cn(
            'text-xs flex items-start gap-1.5',
            hasError && 'text-destructive error-message',
            hasSuccess && 'text-green-500 animate-slide-in-up',
            !hasError && !hasSuccess && 'text-muted-foreground'
          )}
          role={hasError ? 'alert' : undefined}
          aria-live={hasError ? 'polite' : undefined}
        >
          {hasError && <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />}
          {hasSuccess && <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0 success-checkmark" aria-hidden="true" />}
          <span>{error || success || helperText}</span>
        </div>
      )}
    </div>
  )
}

