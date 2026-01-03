import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Show {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  file_path?: string;
  scheduled_by?: string;
}

export const useShows = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchShows = async () => {
    if (!user) {
      setShows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_time', new Date().toISOString()) // Only future/current shows
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching shows:', error);
        setError(error.message);
        return;
      }

      setShows(data || []);
      setError(null);
    } catch (err) {
      console.error('Error in fetchShows:', err);
      setError('Failed to fetch shows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShows();
  }, [user]);

  const getUpcomingShows = (limit: number = 3) => {
    const now = new Date();
    return shows
      .filter(show => new Date(show.start_time) > now)
      .slice(0, limit);
  };

  const getCurrentShow = () => {
    const now = new Date();
    return shows.find(show => 
      new Date(show.start_time) <= now && 
      new Date(show.end_time) > now
    );
  };

  const getNextShow = () => {
    const now = new Date();
    return shows
      .filter(show => new Date(show.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
  };

  return {
    shows,
    loading,
    error,
    fetchShows,
    getUpcomingShows,
    getCurrentShow,
    getNextShow
  };
};