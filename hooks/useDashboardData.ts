'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardStats } from '@/types/dashboard';

interface UseDashboardDataReturn {
  data: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData(): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  // Fetch dashboard data whenever tick changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard');
        const json = await res.json() as DashboardStats;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  // Supabase Realtime subscriptions — trigger refetch on DB changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  return { data, loading, error, refetch };
}
