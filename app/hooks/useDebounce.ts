/**
 * ABOUTME: Debounce hook that delays updating a value until after a specified delay
 * ABOUTME: Useful for preventing excessive API calls when user is typing
 *
 * Usage:
 * ```tsx
 * const [prompt, setPrompt] = useState('')
 * const debouncedPrompt = useDebounce(prompt, 500)
 *
 * // debouncedPrompt only updates 500ms after user stops typing
 * useEffect(() => {
 *   if (debouncedPrompt) {
 *     // Call API with debouncedPrompt
 *   }
 * }, [debouncedPrompt])
 * ```
 */

import { useEffect, useState } from 'react'

/**
 * Debounce a value by delaying updates until after a specified delay period
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up timeout on unmount or when value/delay changes
    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}
