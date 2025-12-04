"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getCurrentTier,
  getNextTier,
  calculateTotalPositionBonus,
  calculateEstimatedWaitTime,
  REFERRAL_TIERS,
  type ReferralTier
} from "@/lib/utils/referral-tiers";
import { Trophy, Users, Clock, Gift } from "lucide-react";

interface TierProgressProps {
  verifiedReferrals: number;
  position: number;
  originalPosition: number;
  dailyLimit?: number;
}

export function TierProgress({
  verifiedReferrals,
  position,
  originalPosition,
  dailyLimit = 20
}: TierProgressProps) {
  const currentTier = getCurrentTier(verifiedReferrals);
  const { nextTier, refsNeeded, progressPercent } = getNextTier(verifiedReferrals);
  const totalBonus = calculateTotalPositionBonus(verifiedReferrals);
  const { formattedText: estimatedWait } = calculateEstimatedWaitTime(position, dailyLimit);
  const positionsSkipped = originalPosition - position;

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card className="p-6 bg-card border border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Trophy className="size-4" />
              <span>Current Tier</span>
            </div>
            <div className="text-2xl font-bold">
              {currentTier ? (
                <span className="flex items-center justify-center gap-2">
                  <span>{currentTier.icon}</span>
                  <span>Tier {currentTier.tier}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="size-4" />
              <span>Verified Refs</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              {verifiedReferrals}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Gift className="size-4" />
              <span>Positions Skipped</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {positionsSkipped > 0 ? `+${positionsSkipped}` : '0'}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="size-4" />
              <span>Estimated Wait</span>
            </div>
            <div className="text-2xl font-bold">
              {estimatedWait}
            </div>
          </div>
        </div>
      </Card>

      {/* Progress to Next Tier */}
      {nextTier && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span>Next Tier: {nextTier.icon} Tier {nextTier.tier}</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {refsNeeded} more referral{refsNeeded !== 1 ? 's' : ''} to unlock
                </p>
              </div>
              <Badge className={`${nextTier.badgeColor} text-white`}>
                +{nextTier.positionBonus} positions
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">Reward: {nextTier.reward}</p>
            </div>
          </div>
        </Card>
      )}

      {/* All Tiers Overview */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">All Reward Tiers</h3>
        <div className="space-y-3">
          {REFERRAL_TIERS.map((tier) => {
            const isUnlocked = verifiedReferrals >= tier.refsRequired;
            const isCurrent = currentTier?.tier === tier.tier;

            return (
              <div
                key={tier.tier}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  isCurrent
                    ? 'border-accent bg-accent/10'
                    : isUnlocked
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-gray-200 dark:border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tier.icon}</span>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span>Tier {tier.tier}</span>
                      {isUnlocked && (
                        <Badge variant="outline" className="bg-green-500 text-white border-green-600">
                          ✓ Unlocked
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="outline" className="bg-accent text-accent-foreground border-accent">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tier.refsRequired} referral{tier.refsRequired !== 1 ? 's' : ''} • {tier.reward}
                    </div>
                  </div>
                </div>
                <Badge className={isUnlocked ? tier.badgeColor : 'bg-gray-400'}>
                  +{tier.positionBonus}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>💡 Pro Tip:</strong> Share your referral link on social media, student groups, or with classmates.
          Each verified referral brings you closer to the next tier and moves you up in the waitlist!
        </p>
      </Card>
    </div>
  );
}
