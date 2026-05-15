-- Create streaming_credentials table
CREATE TABLE public.streaming_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'icecast',
    address TEXT NOT NULL DEFAULT '',
    port INTEGER NOT NULL DEFAULT 8000,
    password TEXT NOT NULL DEFAULT '',
    mountpoint TEXT NOT NULL DEFAULT '/live',
    username TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_events table
CREATE TABLE public.job_events (
    id SERIAL PRIMARY KEY,
    job_id UUID NOT NULL,
    ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL DEFAULT ''
);

-- Add missing columns
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pid INTEGER;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS scheduled_by UUID;

-- Make end_time nullable on recurring_slots since duration_minutes is used
ALTER TABLE public.recurring_slots ALTER COLUMN end_time DROP NOT NULL;

-- Add unique constraint on profiles.user_id for foreign key references
ALTER TABLE public.profiles ADD CONSTRAINT unique_profiles_user_id UNIQUE (user_id);

-- Add foreign key for shows.user_id -> profiles.user_id (for typed joins)
ALTER TABLE public.shows ADD CONSTRAINT fk_shows_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add FK for jobs -> schedules for typed joins
ALTER TABLE public.jobs ADD CONSTRAINT fk_jobs_schedule_id FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.streaming_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Streaming credentials viewable by authenticated" ON public.streaming_credentials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update streaming credentials" ON public.streaming_credentials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can insert streaming credentials" ON public.streaming_credentials FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Job events viewable by authenticated" ON public.job_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert job events" ON public.job_events FOR INSERT TO authenticated WITH CHECK (true);

-- Create a simple check_show_conflict function (used by UnifiedShowsCard)
CREATE OR REPLACE FUNCTION public.check_show_conflict(
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_show_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.shows
  WHERE id != COALESCE(p_exclude_show_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status != 'canceled'
    AND (
      (start_time <= p_start_time AND end_time > p_start_time)
      OR (start_time < p_end_time AND end_time >= p_end_time)
      OR (start_time >= p_start_time AND end_time <= p_end_time)
    );
  RETURN v_count > 0;
END;
$$;
