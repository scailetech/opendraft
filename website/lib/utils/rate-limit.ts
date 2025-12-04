// Simple in-memory rate limiting for verification attempts
// For production, consider using Redis or a more robust solution

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const entriesToDelete: string[] = [];
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      entriesToDelete.push(key);
    }
  });
  entriesToDelete.forEach(key => rateLimitMap.delete(key));
}, 60 * 60 * 1000); // 1 hour

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxAttempts: 10, windowMs: 60 * 60 * 1000 } // 10 attempts per hour
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // No entry or expired entry
  if (!entry || now > entry.resetAt) {
    const newResetAt = now + config.windowMs;
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: newResetAt,
    });
    return {
      success: true,
      remaining: config.maxAttempts - 1,
      resetAt: newResetAt,
    };
  }

  // Entry exists and not expired
  if (entry.count >= config.maxAttempts) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;
  rateLimitMap.set(identifier, entry);

  return {
    success: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}
