/**
 * ABOUTME: Custom hook for validating webhook URLs
 * ABOUTME: Ensures webhook URLs are properly formatted and use HTTPS protocol
 */

import { useMemo } from 'react'

export interface WebhookValidationResult {
  /** True if URL is valid or empty (optional field) */
  isValid: boolean
  /** Error message if validation fails, null otherwise */
  error: string | null
}

/**
 * Validates webhook URL format and security requirements
 *
 * Checks that webhook URL:
 * - Is a valid URL format
 * - Uses HTTPS protocol (not HTTP) for security
 * - Empty URLs are considered valid (webhook is optional)
 *
 * @param webhookUrl - The webhook URL to validate
 * @returns Validation result with validity flag and error message
 *
 * @example
 * const validation = useWebhookValidation(webhookUrl)
 * if (!validation.isValid) {
 *   console.error(validation.error)
 * }
 */
export function useWebhookValidation(webhookUrl: string): WebhookValidationResult {
  return useMemo(() => {
    if (!webhookUrl || webhookUrl.trim() === '') {
      return { isValid: true, error: null } // Empty is valid (optional field)
    }

    try {
      const url = new URL(webhookUrl)

      // Must use HTTPS for security
      if (url.protocol !== 'https:') {
        return { isValid: false, error: 'Webhook URL must use HTTPS (not HTTP) for security' }
      }

      // Valid HTTPS URL
      return { isValid: true, error: null }
    } catch {
      return { isValid: false, error: 'Invalid URL format (must start with https://)' }
    }
  }, [webhookUrl])
}
