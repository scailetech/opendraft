'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, CheckCircle } from 'lucide-react';

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
      averageWaitDays: Math.ceil((waitingResult.count || 0) / 100), // 100 per day
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-border dark:bg-border p-3 rounded-full">
            <Users className="h-6 w-6 text-primary dark:text-border" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">In Waitlist</p>
            <p className="text-2xl font-bold">{stats.totalWaiting.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{stats.totalCompleted.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Wait</p>
            <p className="text-2xl font-bold">
              {stats.averageWaitDays} day{stats.averageWaitDays !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
