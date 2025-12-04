'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface WaitlistUser {
  id: string;
  email: string;
  full_name: string;
  position: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  referral_code: string;
  created_at: string;
  pdf_url?: string;
  docx_url?: string;
}

interface UseWaitlistPositionReturn {
  user: WaitlistUser | null;
  position: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * ABOUTME: Hook for real-time waitlist position tracking with Supabase subscriptions
 * ABOUTME: Provides live updates when position changes (due to referrals or processing)
 */
export function useWaitlistPosition(userId: string): UseWaitlistPositionReturn {
  const [user, setUser] = useState<WaitlistUser | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      setUser(data);
      setPosition(data.position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      console.error('Error fetching waitlist user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setError('User ID is required');
      setIsLoading(false);
      return;
    }

    fetchUser();

    // Subscribe to real-time position updates
    const channel = supabase
      .channel(`waitlist-position-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waitlist',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Position updated:', payload);
          setUser(payload.new as WaitlistUser);
          setPosition((payload.new as WaitlistUser).position);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    user,
    position,
    isLoading,
    error,
    refresh: fetchUser,
  };
}
