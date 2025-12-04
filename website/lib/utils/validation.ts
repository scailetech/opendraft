// Email and input validation utilities

/**
 * List of disposable/temporary email domains to block
 * Add more as needed
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'maildrop.cc',
  'yopmail.com',
  'getnada.com',
  'trashmail.com',
];

/**
 * Validate email format and check if it's not from a disposable domain
 * @param email Email address to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Extract domain
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Check against disposable domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { isValid: false, error: 'Disposable email addresses are not allowed' };
  }

  return { isValid: true };
}

/**
 * Sanitize user input to prevent XSS
 * @param input User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .substring(0, 1000); // Limit length
}

/**
 * Validate thesis topic
 * @param topic Thesis topic string
 * @returns Object with isValid flag and optional error message
 */
export function validateThesisTopic(topic: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(topic);

  if (sanitized.length < 10) {
    return { isValid: false, error: 'Thesis topic must be at least 10 characters' };
  }

  if (sanitized.length > 500) {
    return { isValid: false, error: 'Thesis topic must be less than 500 characters' };
  }

  return { isValid: true };
}

/**
 * Validate full name
 * @param name Full name string
 * @returns Object with isValid flag and optional error message
 */
export function validateFullName(name: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(name);

  if (sanitized.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: 'Name must be less than 100 characters' };
  }

  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(sanitized)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Get client IP address from request headers
 * @param headers Request headers
 * @returns IP address string
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}
