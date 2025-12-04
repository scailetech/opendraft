// Referral code generation and utilities

import { WAITLIST_CONFIG } from '../config/waitlist';

/**
 * Generate a unique referral code
 * Format: 9 characters, uppercase alphanumeric (no confusing chars: 0,O,1,I)
 */
export function generateReferralCode(): string {
  const { REFERRAL_CODE_LENGTH, REFERRAL_CODE_CHARS } = WAITLIST_CONFIG;
  let code = '';

  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * REFERRAL_CODE_CHARS.length);
    code += REFERRAL_CODE_CHARS[randomIndex];
  }

  return code;
}

/**
 * Calculate position skip based on referral count
 * Each referral = 20 positions skipped
 */
export function calculatePositionSkip(referralCount: number): number {
  const { REFERRAL_REWARD } = WAITLIST_CONFIG;
  return -(referralCount * REFERRAL_REWARD);
}

/**
 * Get referral progress info (simplified for 1:1 referral model)
 */
export function getReferralProgress(referralCount: number) {
  const { REFERRAL_REWARD } = WAITLIST_CONFIG;
  const totalPositionsSkipped = referralCount * REFERRAL_REWARD;

  return {
    currentCycleProgress: 0,
    remainingForNextReward: 1,
    totalRewardsEarned: referralCount,
    totalPositionsSkipped,
    progressPercentage: 0,
  };
}

/**
 * Format referral link
 */
export function formatReferralLink(code: string, baseUrl: string = ''): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/waitlist?ref=${code}`;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  const { REFERRAL_CODE_LENGTH, REFERRAL_CODE_CHARS } = WAITLIST_CONFIG;

  if (code.length !== REFERRAL_CODE_LENGTH) return false;

  return code.split('').every(char => REFERRAL_CODE_CHARS.includes(char));
}
