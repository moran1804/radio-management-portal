// SQL script to initialize all required tables for the Station Manager
// This should be run on a fresh Supabase instance before first use

export const generateDatabaseSetupScript = (): string => {
  return `-- Station Manager Database Setup Script
-- Run this SQL in your Supabase SQL Editor before starting the application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_role enum
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('DJ', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role public.user_role DEFAULT 'DJ'::public.user_role NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  icecast_address TEXT,
  icecast_port INTEGER,
  icecast_username TEXT,
  icecast_password_encrypted TEXT,
  icecast_mountpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'DJ',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create djs table
CREATE TABLE IF NOT EXISTS public.djs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  profile_picture_url TEXT,
  icecast_address TEXT,
  icecast_port INTEGER,
  icecast_username TEXT,
  icecast_password_encrypted TEXT,
  icecast_mountpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recurring_slots table
CREATE TABLE IF NOT EXISTS public.recurring_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  dj_id UUID REFERENCES public.djs(id),
  recurring_slot_id UUID REFERENCES public.recurring_slots(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  show_type TEXT DEFAULT 'live',
  file_path TEXT,
  storage_path TEXT,
  duration_seconds INTEGER,
  scheduled_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT shows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  run_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  pid INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_events table
CREATE TABLE IF NOT EXISTS public.job_events (
  id SERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ DEFAULT NOW(),
  level TEXT,
  message TEXT
);

-- Create streaming_credentials table
CREATE TABLE IF NOT EXISTS public.streaming_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT DEFAULT 'icecast' NOT NULL,
  address TEXT DEFAULT '' NOT NULL,
  port INTEGER DEFAULT 8000 NOT NULL,
  username TEXT DEFAULT 'source' NOT NULL,
  password TEXT DEFAULT '' NOT NULL,
  mountpoint TEXT DEFAULT '/live' NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create remote_config table for station settings
CREATE TABLE IF NOT EXISTS public.remote_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remote_config ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::public.user_role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Create function to set initial admin
CREATE OR REPLACE FUNCTION public.set_initial_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run if no admins exist
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'ADMIN') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'ADMIN')
    ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';
    
    UPDATE public.profiles
    SET role = 'ADMIN'
    WHERE user_id = auth.uid();
  END IF;
END;
$$;

-- Create function to check show conflicts
CREATE OR REPLACE FUNCTION public.check_show_conflict(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_show_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shows
    WHERE status != 'cancelled'
      AND id != COALESCE(p_exclude_show_id, uuid_nil())
      AND (
        (start_time < p_end_time AND end_time > p_start_time)
      )
  )
$$;

-- Create function to generate recurring shows
CREATE OR REPLACE FUNCTION public.generate_recurring_shows(
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_weeks_ahead INTEGER DEFAULT 4
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_slot RECORD;
  v_date DATE;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  FOR v_slot IN SELECT * FROM public.recurring_slots WHERE is_active = true LOOP
    FOR i IN 0..(p_weeks_ahead * 7 - 1) LOOP
      v_date := p_start_date + i;
      
      IF EXTRACT(DOW FROM v_date) = v_slot.day_of_week THEN
        v_start_time := v_date + v_slot.start_time;
        v_end_time := v_start_time + (v_slot.duration_minutes || ' minutes')::INTERVAL;
        
        IF NOT EXISTS (
          SELECT 1 FROM public.shows
          WHERE recurring_slot_id = v_slot.id
            AND start_time = v_start_time
        ) THEN
          INSERT INTO public.shows (
            user_id, dj_id, recurring_slot_id, title, description,
            start_time, end_time, status, show_type
          )
          SELECT
            d.user_id, v_slot.dj_id, v_slot.id, v_slot.title, v_slot.description,
            v_start_time, v_end_time, 'scheduled', 'live'
          FROM public.djs d
          WHERE d.id = v_slot.dj_id;
          
          v_count := v_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shows_updated_at ON public.shows;
CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON public.shows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_slots_updated_at ON public.recurring_slots;
CREATE TRIGGER update_recurring_slots_updated_at
  BEFORE UPDATE ON public.recurring_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaming_credentials_updated_at ON public.streaming_credentials;
CREATE TRIGGER update_streaming_credentials_updated_at
  BEFORE UPDATE ON public.streaming_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_remote_config_updated_at ON public.remote_config;
CREATE TRIGGER update_remote_config_updated_at
  BEFORE UPDATE ON public.remote_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'ADMIN'::public.user_role
      ELSE 'DJ'::public.user_role
    END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.user_roles) THEN 'ADMIN'
      ELSE 'DJ'
    END
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: Users can read all profiles, update their own
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- User Roles: Only admins can manage
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- DJs: All authenticated users can view
DROP POLICY IF EXISTS "All users can view DJs" ON public.djs;
CREATE POLICY "All users can view DJs" ON public.djs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own DJ profile" ON public.djs;
CREATE POLICY "Users can update their own DJ profile" ON public.djs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage DJs" ON public.djs;
CREATE POLICY "Admins can manage DJs" ON public.djs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Shows: All can view, users can manage their own, admins can manage all
DROP POLICY IF EXISTS "All users can view shows" ON public.shows;
CREATE POLICY "All users can view shows" ON public.shows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage their own shows" ON public.shows;
CREATE POLICY "Users can manage their own shows" ON public.shows
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all shows" ON public.shows;
CREATE POLICY "Admins can manage all shows" ON public.shows
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Recurring Slots: Admins only
DROP POLICY IF EXISTS "All users can view recurring slots" ON public.recurring_slots;
CREATE POLICY "All users can view recurring slots" ON public.recurring_slots
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage recurring slots" ON public.recurring_slots;
CREATE POLICY "Admins can manage recurring slots" ON public.recurring_slots
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Schedules: All can view, admins can manage
DROP POLICY IF EXISTS "All users can view schedules" ON public.schedules;
CREATE POLICY "All users can view schedules" ON public.schedules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage schedules" ON public.schedules;
CREATE POLICY "Admins can manage schedules" ON public.schedules
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Jobs: All can view, system/admins can manage
DROP POLICY IF EXISTS "All users can view jobs" ON public.jobs;
CREATE POLICY "All users can view jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can manage jobs" ON public.jobs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Job Events: All can view
DROP POLICY IF EXISTS "All users can view job events" ON public.job_events;
CREATE POLICY "All users can view job events" ON public.job_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "System can insert job events" ON public.job_events;
CREATE POLICY "System can insert job events" ON public.job_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Streaming Credentials: Admins can manage, DJs can view
DROP POLICY IF EXISTS "All users can view streaming credentials" ON public.streaming_credentials;
CREATE POLICY "All users can view streaming credentials" ON public.streaming_credentials
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage streaming credentials" ON public.streaming_credentials;
CREATE POLICY "Admins can manage streaming credentials" ON public.streaming_credentials
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Remote Config: All can view, admins can manage
DROP POLICY IF EXISTS "All users can view remote config" ON public.remote_config;
CREATE POLICY "All users can view remote config" ON public.remote_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage remote config" ON public.remote_config;
CREATE POLICY "Admins can manage remote config" ON public.remote_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Done!
SELECT 'Database setup complete!' AS status;
`;
};

export const downloadDatabaseScript = () => {
  const script = generateDatabaseSetupScript();
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'station-manager-setup.sql';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
