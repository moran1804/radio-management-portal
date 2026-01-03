-- Create user roles table if not exists (check if already have roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','dj')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can read own role" ON public.user_roles 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles" ON public.user_roles 
FOR SELECT TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
);

CREATE POLICY "Admins can manage all roles" ON public.user_roles 
FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
);

-- Create DJs table for streaming credentials
CREATE TABLE IF NOT EXISTS public.djs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  ice_user text NOT NULL,
  ice_pass_enc text NOT NULL,
  mount text NOT NULL DEFAULT '/live',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;

-- DJ policies
CREATE POLICY "DJs can read/update own credentials" ON public.djs 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "DJs can insert own credentials" ON public.djs 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "DJs can update own credentials" ON public.djs 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all DJs" ON public.djs 
FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
);

-- Update existing shows table to link to DJs
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS dj_id uuid REFERENCES public.djs(id) ON DELETE CASCADE;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS duration_seconds int;

-- Update shows table to use dj_id instead of user_id for RLS
DROP POLICY IF EXISTS "Users can create their own shows" ON public.shows;
DROP POLICY IF EXISTS "Users can view their own shows" ON public.shows;
DROP POLICY IF EXISTS "Users can update their own shows" ON public.shows;
DROP POLICY IF EXISTS "Users can delete their own shows" ON public.shows;

CREATE POLICY "DJs can manage own shows" ON public.shows 
FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.djs d WHERE d.id = shows.dj_id AND d.user_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.djs d WHERE d.id = shows.dj_id AND d.user_id = auth.uid())
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','queued','completed','failed','canceled')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_time_valid CHECK (ends_at > starts_at)
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DJs can manage own schedules" ON public.schedules 
FOR ALL TO authenticated 
USING (
  EXISTS(
    SELECT 1 FROM public.shows s 
    JOIN public.djs d ON d.id = s.dj_id 
    WHERE s.id = schedules.show_id AND d.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.shows s 
    JOIN public.djs d ON d.id = s.dj_id 
    WHERE s.id = schedules.show_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all schedules" ON public.schedules 
FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','starting','running','ended','failed','canceled')),
  pid int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DJs can read own jobs" ON public.jobs 
FOR SELECT TO authenticated 
USING (
  EXISTS(
    SELECT 1 FROM public.schedules s 
    JOIN public.shows sh ON sh.id = s.show_id 
    JOIN public.djs d ON d.id = sh.dj_id 
    WHERE s.id = jobs.schedule_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all jobs" ON public.jobs 
FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
);

-- Create job events table
CREATE TABLE IF NOT EXISTS public.job_events (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  ts timestamptz DEFAULT now(),
  level text DEFAULT 'info',
  message text
);

ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DJs can read own job events" ON public.job_events 
FOR SELECT TO authenticated 
USING (
  EXISTS(
    SELECT 1 FROM public.jobs j 
    JOIN public.schedules s ON s.id = j.schedule_id 
    JOIN public.shows sh ON sh.id = s.show_id 
    JOIN public.djs d ON d.id = sh.dj_id 
    WHERE j.id = job_events.job_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all job events" ON public.job_events 
FOR ALL TO authenticated 
USING (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role='admin')
);

-- Enable realtime for job_events
ALTER TABLE public.job_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_events;