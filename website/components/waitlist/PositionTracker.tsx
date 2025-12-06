'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingDown } from 'lucide-react';
import { WAITLIST_CONFIG } from '@/lib/config/waitlist';

interface PositionTrackerProps {
  userId: string;
  initialPosition?: number;
}

export function PositionTracker({ userId, initialPosition }: PositionTrackerProps) {
  const [position, setPosition] = useState<number | null>(initialPosition || null);
  const [loading, setLoading] = useState(!initialPosition);

  useEffect(() => {
    // Initial fetch if no initial position provided
    if (!initialPosition) {
      fetchPosition();
    }

    // Real-time subscription for position updates
    const channel = supabase
      .channel('position-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waitlist',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && 'position' in payload.new) {
            setPosition(payload.new.position as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, initialPosition]);

  const fetchPosition = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('waitlist')
      .select('position')
      .eq('id', userId)
      .single();

    if (data) {
      setPosition(data.position);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (position === null) {
    return null;
  }

  const daysUntilProcessing = Math.ceil(position / WAITLIST_CONFIG.DAILY_THESIS_LIMIT);
  const progressValue = Math.max(0, 100 - (position / WAITLIST_CONFIG.DAILY_THESIS_LIMIT) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-accent" />
          Your Position in Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-6xl font-bold text-accent">
            #{position}
          </div>
          <p className="text-muted-foreground mt-2">
            {position <= WAITLIST_CONFIG.DAILY_THESIS_LIMIT
              ? `You&apos;re in the next batch!`
              : `Approximately ${daysUntilProcessing} day${daysUntilProcessing > 1 ? 's' : ''} until your thesis`}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-3" />
        </div>

        {position > WAITLIST_CONFIG.DAILY_THESIS_LIMIT && (
          <div className="bg-accent/10 p-4 rounded-lg">
            <p className="text-sm text-accent">
              <strong>Want to skip ahead?</strong> Each referral skips you 20 positions, and your friend gets 10 positions too!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
