// ABOUTME: Anti-fraud utilities for referral program
// ABOUTME: Implements email validation, rate limiting, and abuse detection

// List of disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'sharklasers.com',
  'maildrop.cc',
  'getnada.com',
  'trashmail.com',
  'dispostable.com',
  'mintemail.com',
  'emailondeck.com',
  'fakeinbox.com',
];

/**
 * Check if email is from a disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Check if email uses alias notation (user+1@domain.com, user+2@domain.com)
 * These can be used to create unlimited fake accounts from one email
 */
export function isEmailAlias(email: string): boolean {
  const localPart = email.split('@')[0];
  return localPart.includes('+');
}

/**
 * Check if email is from a university (.edu domain)
 * University emails get bonus points and are less likely to be fraudulent
 */
export function isUniversityEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return domain?.endsWith('.edu') ?? false;
}

/**
 * Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Comprehensive email validation for waitlist signup
 */
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
  isUniversity: boolean;
} {
  if (!email) {
    return { isValid: false, error: 'Email is required', isUniversity: false };
  }

  if (!isValidEmailFormat(email)) {
    return { isValid: false, error: 'Invalid email format', isUniversity: false };
  }

  if (isDisposableEmail(email)) {
    return {
      isValid: false,
      error: 'Disposable email addresses are not allowed. Please use your university or personal email.',
      isUniversity: false,
    };
  }

  if (isEmailAlias(email)) {
    return {
      isValid: false,
      error: 'Email aliases (e.g., user+1@domain.com) are not allowed to prevent abuse.',
      isUniversity: false,
    };
  }

  const isUniversity = isUniversityEmail(email);

  return { isValid: true, isUniversity };
}

/**
 * Rate limiting for referrals
 * Tracks referral creation timestamps and enforces limits
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingToday: number;
  resetAt: Date;
  message?: string;
}

const REFERRAL_RATE_LIMIT = 10; // Max 10 referrals per 24 hours
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if user has exceeded referral rate limit
 * @param referralTimestamps - Array of timestamp strings when referrals were created
 */
export function checkReferralRateLimit(referralTimestamps: string[]): RateLimitResult {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // Filter referrals created in last 24 hours
  const recentReferrals = referralTimestamps.filter(ts => {
    const refDate = new Date(ts);
    return refDate >= windowStart;
  });

  const resetAt = new Date(
    Math.min(...recentReferrals.map(ts => new Date(ts).getTime())) + RATE_LIMIT_WINDOW_MS
  );

  if (recentReferrals.length >= REFERRAL_RATE_LIMIT) {
    return {
      allowed: false,
      remainingToday: 0,
      resetAt,
      message: `Referral limit reached. You can create ${REFERRAL_RATE_LIMIT} referrals per 24 hours. Try again after ${resetAt.toLocaleString()}.`,
    };
  }

  return {
    allowed: true,
    remainingToday: REFERRAL_RATE_LIMIT - recentReferrals.length,
    resetAt,
  };
}

/**
 * Flag suspicious referral patterns for manual review
 */
export function detectSuspiciousActivity(data: {
  totalReferrals: number;
  verifiedReferrals: number;
  referralTimestamps: string[];
  ipAddress?: string;
}): {
  isSuspicious: boolean;
  reasons: string[];
  requiresManualReview: boolean;
} {
  const reasons: string[] = [];
  let isSuspicious = false;
  let requiresManualReview = false;

  // Flag 1: Excessive referrals in short time (> 5 in 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReferrals = data.referralTimestamps.filter(ts => new Date(ts) >= oneHourAgo).length;

  if (recentReferrals > 5) {
    isSuspicious = true;
    reasons.push(`${recentReferrals} referrals created in last hour (normal: 1-2)`);
  }

  // Flag 2: Low verification rate (< 30% verified)
  if (data.totalReferrals > 5) {
    const verificationRate = data.verifiedReferrals / data.totalReferrals;
    if (verificationRate < 0.3) {
      isSuspicious = true;
      reasons.push(`Low verification rate: ${(verificationRate * 100).toFixed(0)}% (normal: 50-80%)`);
    }
  }

  // Flag 3: Excessive total referrals (> 15 requires manual review)
  if (data.totalReferrals >= 15) {
    requiresManualReview = true;
    reasons.push('High referral count requires manual verification');
  }

  // Flag 4: Very high referrals (> 25 is extremely suspicious)
  if (data.totalReferrals > 25) {
    isSuspicious = true;
    reasons.push(`Abnormally high referral count: ${data.totalReferrals} (normal: 3-10)`);
  }

  return { isSuspicious, reasons, requiresManualReview };
}

/**
 * Generate secure verification token
 */
export function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Check if verification token has expired (48 hour window)
 */
export function isVerificationTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
