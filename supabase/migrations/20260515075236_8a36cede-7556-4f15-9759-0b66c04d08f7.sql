-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'DJ',
    icecast_username TEXT,
    icecast_password_encrypted TEXT,
    icecast_address TEXT,
    icecast_port INTEGER,
    icecast_mountpoint TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create djs table
CREATE TABLE public.djs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    profile_picture_url TEXT,
    icecast_username TEXT,
    icecast_password_encrypted TEXT,
    icecast_address TEXT,
    icecast_port INTEGER,
    icecast_mountpoint TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shows table
CREATE TABLE public.shows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dj_id UUID,
    show_type TEXT NOT NULL DEFAULT 'live',
    status TEXT NOT NULL DEFAULT 'draft',
    file_path TEXT,
    storage_path TEXT,
    recurring_slot_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedules table
CREATE TABLE public.schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    show_id UUID NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID,
    show_id UUID,
    run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recurring_slots table
CREATE TABLE public.recurring_slots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    dj_id UUID,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create station_config table
CREATE TABLE public.station_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create show_recordings table
CREATE TABLE public.show_recordings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    show_id UUID,
    title TEXT NOT NULL,
    file_path TEXT,
    storage_path TEXT,
    duration INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jingles table
CREATE TABLE public.jingles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT,
    storage_path TEXT,
    duration INTEGER,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create external_storage table
CREATE TABLE public.external_storage (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config JSONB,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jingles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_storage ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "DJs are viewable by authenticated users" ON public.djs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own DJ record" ON public.djs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert DJs" ON public.djs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Shows are viewable by authenticated users" ON public.shows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert shows" ON public.shows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update shows" ON public.shows FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Schedules are viewable by authenticated users" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert schedules" ON public.schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update schedules" ON public.schedules FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Jobs are viewable by authenticated users" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Recurring slots are viewable by authenticated users" ON public.recurring_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert recurring slots" ON public.recurring_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update recurring slots" ON public.recurring_slots FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Station config is viewable by all" ON public.station_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert station config" ON public.station_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update station config" ON public.station_config FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Show recordings are viewable by authenticated users" ON public.show_recordings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert show recordings" ON public.show_recordings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update show recordings" ON public.show_recordings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Jingles are viewable by authenticated users" ON public.jingles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert jingles" ON public.jingles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update jingles" ON public.jingles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "External storage is viewable by authenticated users" ON public.external_storage FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert external storage" ON public.external_storage FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update external storage" ON public.external_storage FOR UPDATE TO authenticated USING (true);
