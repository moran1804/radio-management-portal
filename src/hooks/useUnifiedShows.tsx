import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UnifiedShow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  file_path: string | null;
  storage_path: string | null;
  user_id: string;
  dj_id: string | null;
  scheduled_by: string | null;
  created_at: string;
  updated_at: string;
  duration_seconds: number | null;
  show_type: 'live' | 'prerecorded';
  recurring_slot_id: string | null;
  // DJ information
  dj_name?: string | null;
  // Schedule information (if exists)
  schedule?: {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
  } | null;
  // Job information (if exists)  
  job?: {
    id: string;
    status: string;
    run_at: string;
    pid: number | null;
  } | null;
}

export const useUnifiedShows = (showAllShows = false) => {
  const [shows, setShows] = useState<UnifiedShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchShows = async () => {
    if (!user?.id) {
      setShows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First get the user's DJ IDs
      const { data: userDJs } = await supabase
        .from('djs')
        .select('id')
        .eq('user_id', user.id);

      const djIds = userDJs?.map(dj => dj.id) || [];

      // Check if we should show all shows (calendar view) or filtered shows (dashboard view)
      let query = supabase
        .from('shows')
        .select(`
          *,
          profiles!shows_user_id_fkey (
            name
          ),
          schedules (
            id,
            starts_at,
            ends_at,
            status,
            jobs (
              id,
              status,
              run_at,
              pid
            )
          )
        `);

      // Show all shows if showAllShows parameter is true (calendar view)
      // Otherwise, filter to user's shows (dashboard view)
      if (!showAllShows) {
        // Filter to only user's shows for dashboard view
        query = query.or(`user_id.eq.${user.id}${djIds.length > 0 ? `,dj_id.in.(${djIds.join(',')})` : ''}`);
      }

      const { data, error: fetchError } = await query.order('start_time', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('Fetched shows for user:', user.id, 'Shows count:', data?.length || 0, 'User role:', profile?.role, 'Show all shows:', showAllShows);

      // Transform the data to include schedule and job info
      const unifiedShows: UnifiedShow[] = data?.map(show => ({
        ...show,
        show_type: (show.show_type as 'live' | 'prerecorded') || 'live',
        dj_name: show.profiles?.name || null,
        schedule: show.schedules?.[0] || null,
        job: show.schedules?.[0]?.jobs?.[0] || null,
      })) || [];

      setShows(unifiedShows);
    } catch (err) {
      console.error('Error fetching unified shows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShows();
  }, [user?.id, profile?.role, showAllShows]);

  // Set up real-time subscription for show updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔴 Setting up real-time subscriptions for user:', user.id);

    const channel = supabase
      .channel('unified-shows-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shows'
        },
        (payload) => {
          console.log('🔴 Show change detected:', payload);
          fetchShows(); // Reload shows when any show changes
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'schedules'
        },
        (payload) => {
          console.log('🔴 Schedule change detected:', payload);
          fetchShows(); // Reload when schedules change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('🔴 Job change detected:', payload);
          fetchShows(); // Reload when jobs change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'djs'
        },
        (payload) => {
          console.log('🔴 DJ change detected:', payload);
          fetchShows(); // Reload when DJ profiles change
        }
      )
      .subscribe((status) => {
        console.log('🔴 Real-time subscription status:', status);
      });

    return () => {
      console.log('🔴 Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Helper functions
  const getUpcomingShows = (limit?: number) => {
    const now = new Date();
    const threeWeeksFromNow = new Date();
    threeWeeksFromNow.setDate(now.getDate() + 21); // 3 weeks = 21 days
    
    const upcoming = shows
      .filter(show => {
        const endTime = new Date(show.end_time);
        const startTime = new Date(show.start_time);
        // Include shows that haven't ended yet and start within the next 3 weeks
        return endTime > now && startTime <= threeWeeksFromNow;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    return limit ? upcoming.slice(0, limit) : upcoming;
  };

  const getPastShows = (limit?: number) => {
    const past = shows
      .filter(show => new Date(show.end_time) < new Date())
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    
    return limit ? past.slice(0, limit) : past;
  };

  const getCurrentShow = () => {
    const now = new Date();
    return shows.find(show => 
      new Date(show.start_time) <= now && new Date(show.end_time) > now
    );
  };

  const getNextShow = () => {
    return getUpcomingShows(1)[0] || null;
  };

  const getScheduledShows = () => {
    return shows.filter(show => show.schedule !== null);
  };

  const getAdHocShows = () => {
    return shows.filter(show => show.schedule === null);
  };

  return {
    shows,
    loading,
    error,
    fetchShows,
    getUpcomingShows,
    getPastShows,
    getCurrentShow,
    getNextShow,
    getScheduledShows,
    getAdHocShows
  };
};