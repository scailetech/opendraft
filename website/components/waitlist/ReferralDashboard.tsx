'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getReferralProgress, formatReferralLink } from '@/lib/utils/referral';
import { ShareButtons } from './ShareButtons';
import { Gift, Users } from 'lucide-react';

interface ReferralDashboardProps {
  referralCode: string;
  userId: string;
}

export function ReferralDashboard({ referralCode, userId }: ReferralDashboardProps) {
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralCount();

    // Subscribe to referral changes
    const channel = supabase
      .channel('referral-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_code=eq.${referralCode}`,
        },
        () => {
          fetchReferralCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [referralCode]);

  const fetchReferralCount = async () => {
    setLoading(true);

    // Get verified referral count
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_code', referralCode);

    setReferralCount(count || 0);
    setLoading(false);
  };

  const progress = getReferralProgress(referralCount);
  const referralLink = formatReferralLink(referralCode);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Referral Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress toward next reward */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Progress to Next Reward
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.currentCycleProgress}/3 friends
            </span>
          </div>
          <Progress value={progress.progressPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {progress.remainingForNextReward === 0
              ? '🎉 Reward unlocked! Share with 3 more to skip another 100 positions!'
              : `${progress.remainingForNextReward} more friend${progress.remainingForNextReward > 1 ? 's' : ''} to skip 100 positions`}
          </p>
        </div>

        {/* Total rewards earned */}
        {progress.totalRewardsEarned > 0 && (
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-green-800 dark:text-green-200">
                Total Rewards Earned
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {progress.totalPositionsSkipped} positions skipped!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              From {referralCount} verified referral{referralCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Share buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Share Your Referral Link:</p>
          <ShareButtons referralLink={referralLink} referralCode={referralCode} />
        </div>

        {/* Explanation */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-sm">How it works:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✅ Share your unique referral link with friends</li>
            <li>✅ They sign up and verify their email</li>
            <li>✅ Every 3 verified referrals = skip 100 positions</li>
            <li>✅ No limit on how many times you can earn rewards!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
