'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const totalPositionsSkipped = referralCount * 20;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Referral Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current stats */}
        <div className="text-center py-4">
          <p className="text-4xl font-bold font-mono">{referralCount}</p>
          <p className="text-sm text-muted-foreground">
            verified referral{referralCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total rewards earned */}
        {totalPositionsSkipped > 0 && (
          <div className="bg-accent/10 p-4 rounded-lg border border-accent/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-accent" />
              <span className="font-medium">Positions Skipped</span>
            </div>
            <p className="text-3xl font-bold font-mono text-accent">
              {totalPositionsSkipped}
            </p>
          </div>
        )}

        {/* Share buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Share your link:</p>
          <ShareButtons referralLink={referralLink} referralCode={referralCode} />
        </div>

        {/* Simple explanation */}
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            Each verified referral = <span className="font-semibold text-foreground">20 positions</span> skipped
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
