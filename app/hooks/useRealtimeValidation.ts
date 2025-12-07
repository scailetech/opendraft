/**
 * useRealtimeValidation Hook
 * 
 * Provides real-time validation feedback as users type.
 * Debounces validation to avoid excessive checks.
 */

import { useState, useEffect, useCallback } from 'react'

export interface ValidationRule<T = string> {
  /** Validation function - returns error message or null */
  validate: (value: T) => string | null
  /** Debounce delay in milliseconds */
  debounceMs?: number
}

interface UseRealtimeValidationOptions<T = string> {
  /** Initial value */
  value: T
  /** Validation rules */
  rules: ValidationRule<T>[]
  /** Whether validation is enabled */
  enabled?: boolean
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean, errors: string[]) => void
}

interface ValidationState {
  /** Current error messages */
  errors: string[]
  /** Whether field is currently valid */
  isValid: boolean
  /** Whether validation has been touched (user has interacted) */
  touched: boolean
  /** Whether validation is in progress (debouncing) */
  isValidating: boolean
}

/**
 * Hook for real-time validation with debouncing
 */
export function useRealtimeValidation<T = string>({
  value,
  rules,
  enabled = true,
  onValidationChange,
}: UseRealtimeValidationOptions<T>): ValidationState & {
  /** Mark field as touched */
  setTouched: () => void
  /** Manually trigger validation */
  validate: () => void
} {
  const [state, setState] = useState<ValidationState>({
    errors: [],
    isValid: true,
    touched: false,
    isValidating: false,
  })

  const validate = useCallback(() => {
    if (!enabled) {
      setState({
        errors: [],
        isValid: true,
        touched: state.touched,
        isValidating: false,
      })
      return
    }

    const errors: string[] = []
    
    for (const rule of rules) {
      const error = rule.validate(value)
      if (error) {
        errors.push(error)
      }
    }

    const isValid = errors.length === 0
    
    setState({
      errors,
      isValid,
      touched: state.touched,
      isValidating: false,
    })

    onValidationChange?.(isValid, errors)
  }, [value, rules, enabled, state.touched, onValidationChange])

  // Debounced validation
  useEffect(() => {
    if (!enabled || !state.touched) {
      return
    }

    // Find the maximum debounce delay from rules
    const maxDebounce = Math.max(
      ...rules.map(r => r.debounceMs || 300),
      300 // Default 300ms
    )

    setState(prev => ({ ...prev, isValidating: true }))

    const timeoutId = setTimeout(() => {
      validate()
    }, maxDebounce)

    return () => clearTimeout(timeoutId)
  }, [value, enabled, state.touched, rules, validate])

  const setTouched = useCallback(() => {
    setState(prev => ({ ...prev, touched: true }))
    // Validate immediately when touched
    validate()
  }, [validate])

  return {
    ...state,
    setTouched,
    validate,
  }
}

