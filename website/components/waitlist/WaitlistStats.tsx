'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Users, CheckCircle, Clock } from 'lucide-react';

export function WaitlistStats() {
  const [stats, setStats] = useState({
    totalWaiting: 0,
    totalCompleted: 0,
    averageWaitDays: 0,
  });

  useEffect(() => {
    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('waitlist-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const [waitingResult, completedResult] = await Promise.all([
      supabase
        .from('waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .eq('email_verified', true),
      supabase
        .from('waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
    ]);

    setStats({
      totalWaiting: waitingResult.count || 0,
      totalCompleted: completedResult.count || 0,
      averageWaitDays: Math.ceil((waitingResult.count || 0) / 20), // 20 per day
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 bg-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 text-sm">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">In waitlist:</span>
        <span className="font-medium">{stats.totalWaiting.toLocaleString()}</span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-border" />

      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="w-4 h-4 text-accent" />
        <span className="text-muted-foreground">Completed:</span>
        <span className="font-medium">{stats.totalCompleted.toLocaleString()}</span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-border" />

      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Avg. wait:</span>
        <span className="font-medium">
          ~{stats.averageWaitDays} day{stats.averageWaitDays !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
