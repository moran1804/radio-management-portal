CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('DJ', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'DJ',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remote_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remote_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::public.user_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.set_initial_admin()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'ADMIN') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'ADMIN')
      ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';
    UPDATE public.profiles SET role = 'ADMIN' WHERE user_id = auth.uid();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_show_conflict(
  p_start_time TIMESTAMPTZ, p_end_time TIMESTAMPTZ, p_exclude_show_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shows
    WHERE status != 'cancelled'
      AND id != COALESCE(p_exclude_show_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (start_time < p_end_time AND end_time > p_start_time)
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_recurring_shows(
  p_start_date DATE DEFAULT CURRENT_DATE, p_weeks_ahead INTEGER DEFAULT 4
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER := 0; v_slot RECORD; v_date DATE;
  v_start_time TIMESTAMPTZ; v_end_time TIMESTAMPTZ;
BEGIN
  FOR v_slot IN SELECT * FROM public.recurring_slots WHERE is_active = true LOOP
    FOR i IN 0..(p_weeks_ahead * 7 - 1) LOOP
      v_date := p_start_date + i;
      IF EXTRACT(DOW FROM v_date) = v_slot.day_of_week THEN
        v_start_time := (v_date || ' ' || v_slot.start_time)::TIMESTAMPTZ;
        v_end_time := v_start_time + (v_slot.duration_minutes || ' minutes')::INTERVAL;
        IF NOT EXISTS (SELECT 1 FROM public.shows WHERE recurring_slot_id = v_slot.id AND start_time = v_start_time) THEN
          INSERT INTO public.shows (user_id, dj_id, recurring_slot_id, title, description, start_time, end_time, status, show_type)
          SELECT d.user_id, v_slot.dj_id, v_slot.id, v_slot.title, v_slot.description, v_start_time, v_end_time, 'scheduled', 'live'
          FROM public.djs d WHERE d.id = v_slot.dj_id;
          v_count := v_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_shows_updated_at ON public.shows;
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_recurring_slots_updated_at ON public.recurring_slots;
CREATE TRIGGER update_recurring_slots_updated_at BEFORE UPDATE ON public.recurring_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_streaming_credentials_updated_at ON public.streaming_credentials;
CREATE TRIGGER update_streaming_credentials_updated_at BEFORE UPDATE ON public.streaming_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_remote_config_updated_at ON public.remote_config;
CREATE TRIGGER update_remote_config_updated_at BEFORE UPDATE ON public.remote_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role) VALUES (
    NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'ADMIN' ELSE 'DJ' END
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (
    NEW.id, CASE WHEN NOT EXISTS (SELECT 1 FROM public.user_roles) THEN 'ADMIN' ELSE 'DJ' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "DJs are viewable by authenticated users" ON public.djs;
DROP POLICY IF EXISTS "Users can update own DJ record" ON public.djs;
DROP POLICY IF EXISTS "Admins can insert DJs" ON public.djs;
CREATE POLICY "All users can view DJs" ON public.djs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own DJ profile" ON public.djs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage DJs" ON public.djs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Shows are viewable by authenticated users" ON public.shows;
DROP POLICY IF EXISTS "Authenticated can insert shows" ON public.shows;
DROP POLICY IF EXISTS "Authenticated can update shows" ON public.shows;
CREATE POLICY "All users can view shows" ON public.shows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own shows" ON public.shows FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all shows" ON public.shows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Recurring slots are viewable by authenticated users" ON public.recurring_slots;
DROP POLICY IF EXISTS "Authenticated can insert recurring slots" ON public.recurring_slots;
DROP POLICY IF EXISTS "Authenticated can update recurring slots" ON public.recurring_slots;
CREATE POLICY "All users can view recurring slots" ON public.recurring_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage recurring slots" ON public.recurring_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Schedules are viewable by authenticated users" ON public.schedules;
DROP POLICY IF EXISTS "Authenticated can insert schedules" ON public.schedules;
DROP POLICY IF EXISTS "Authenticated can update schedules" ON public.schedules;
CREATE POLICY "All users can view schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Jobs are viewable by authenticated users" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated can update jobs" ON public.jobs;
CREATE POLICY "All users can view jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage jobs" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Job events viewable by authenticated" ON public.job_events;
DROP POLICY IF EXISTS "Authenticated can insert job events" ON public.job_events;
CREATE POLICY "All users can view job events" ON public.job_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert job events" ON public.job_events FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Streaming credentials viewable by authenticated" ON public.streaming_credentials;
DROP POLICY IF EXISTS "Authenticated can insert streaming credentials" ON public.streaming_credentials;
DROP POLICY IF EXISTS "Authenticated can update streaming credentials" ON public.streaming_credentials;
CREATE POLICY "All users can view streaming credentials" ON public.streaming_credentials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage streaming credentials" ON public.streaming_credentials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "All users can view remote config" ON public.remote_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage remote config" ON public.remote_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
