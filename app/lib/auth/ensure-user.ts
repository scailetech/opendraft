/**
 * Utility to ensure user record exists in database
 * Extracted to follow DRY principle
 */

export async function ensureUserRecord(userId: string, email: string | null | undefined): Promise<void> {
  try {
    await fetch('/api/auth/ensure-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    })
  } catch {
    // Silently ignore - table may not exist in development or API may be unavailable
  }
}


