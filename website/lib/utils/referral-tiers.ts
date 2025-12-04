// ABOUTME: Referral tier system configuration and utilities
// ABOUTME: Implements McKinsey-optimized 5-tier reward structure for viral growth

export interface ReferralTier {
  tier: number;
  refsRequired: number;
  positionBonus: number;
  reward: string;
  badgeColor: string;
  icon: string;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  {
    tier: 1,
    refsRequired: 1,
    positionBonus: 30,
    reward: "Thesis Template Download",
    badgeColor: "bg-blue-500",
    icon: "🎯",
  },
  {
    tier: 2,
    refsRequired: 3,
    positionBonus: 150,
    reward: "Early Beta Access",
    badgeColor: "bg-purple-500",
    icon: "⚡",
  },
  {
    tier: 3,
    refsRequired: 5,
    positionBonus: 300,
    reward: "Priority Support",
    badgeColor: "bg-pink-500",
    icon: "💎",
  },
  {
    tier: 4,
    refsRequired: 10,
    positionBonus: 1000,
    reward: "Free Thesis Generation",
    badgeColor: "bg-amber-500",
    icon: "👑",
  },
  {
    tier: 5,
    refsRequired: 15,
    positionBonus: 1500,
    reward: "Manual Review Required",
    badgeColor: "bg-red-500",
    icon: "🚨",
  },
];

// Two-sided incentive: referee gets bonus for using referral link
export const REFEREE_BONUS = 20;

// Calculate current tier based on verified referrals
export function getCurrentTier(verifiedReferrals: number): ReferralTier | null {
  // Return highest tier achieved
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (verifiedReferrals >= REFERRAL_TIERS[i].refsRequired) {
      return REFERRAL_TIERS[i];
    }
  }
  return null;
}

// Calculate next tier and progress
export function getNextTier(verifiedReferrals: number): {
  nextTier: ReferralTier | null;
  refsNeeded: number;
  progressPercent: number;
} {
  const currentTier = getCurrentTier(verifiedReferrals);
  const currentTierIndex = currentTier ? REFERRAL_TIERS.findIndex(t => t.tier === currentTier.tier) : -1;

  // Check if there's a next tier
  if (currentTierIndex < REFERRAL_TIERS.length - 1) {
    const nextTier = REFERRAL_TIERS[currentTierIndex + 1];
    const previousTierRefs = currentTier?.refsRequired ?? 0;
    const refsNeeded = nextTier.refsRequired - verifiedReferrals;
    const progressPercent = Math.min(
      100,
      ((verifiedReferrals - previousTierRefs) / (nextTier.refsRequired - previousTierRefs)) * 100
    );

    return { nextTier, refsNeeded, progressPercent };
  }

  // Already at max tier
  return { nextTier: null, refsNeeded: 0, progressPercent: 100 };
}

// Calculate total position bonus from all achieved tiers
export function calculateTotalPositionBonus(verifiedReferrals: number): number {
  let totalBonus = 0;

  for (const tier of REFERRAL_TIERS) {
    if (verifiedReferrals >= tier.refsRequired) {
      totalBonus = tier.positionBonus;
    } else {
      break;
    }
  }

  // Apply diminishing returns for excessive referrals (anti-fraud)
  if (verifiedReferrals > 15) {
    const excessRefs = verifiedReferrals - 15;
    // Each ref beyond 15 only adds 10 positions (vs 100 per tier)
    totalBonus += Math.min(excessRefs * 10, 500); // Cap at +500 bonus
  }

  return totalBonus;
}

// Calculate estimated wait time based on position and daily processing limit
export function calculateEstimatedWaitTime(position: number, dailyLimit: number = 20): {
  days: number;
  hours: number;
  formattedText: string;
} {
  const days = Math.ceil(position / dailyLimit);
  const hours = days * 24;

  let formattedText = "";
  if (days === 0) {
    formattedText = "Processing soon!";
  } else if (days === 1) {
    formattedText = "~1 day";
  } else if (days <= 7) {
    formattedText = `~${days} days`;
  } else {
    const weeks = Math.ceil(days / 7);
    formattedText = `~${weeks} week${weeks > 1 ? 's' : ''}`;
  }

  return { days, hours, formattedText };
}

// Get all rewards unlocked for user
export function getUnlockedRewards(verifiedReferrals: number): string[] {
  const rewards: string[] = [];

  for (const tier of REFERRAL_TIERS) {
    if (verifiedReferrals >= tier.refsRequired) {
      rewards.push(tier.reward);
    } else {
      break;
    }
  }

  return rewards;
}
