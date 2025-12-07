/**
 * Shared authentication validation utilities
 * Follows DRY principle - single source of truth for validation logic
 */

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password strength
 * Requirements: Minimum 8 characters, at least one letter and one number
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
}


