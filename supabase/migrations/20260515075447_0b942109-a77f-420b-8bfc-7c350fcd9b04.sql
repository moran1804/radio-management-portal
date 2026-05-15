-- Drop duplicate foreign keys on jobs
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS fk_jobs_schedule;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS fk_jobs_schedule_id;

-- Create clean single FK from jobs to schedules
ALTER TABLE public.jobs ADD CONSTRAINT fk_jobs_schedule_id FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;

-- Rename shows FK to match code expectations
ALTER TABLE public.shows DROP CONSTRAINT IF EXISTS fk_shows_user_profile;
ALTER TABLE public.shows ADD CONSTRAINT shows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add created_by column to recurring_slots
ALTER TABLE public.recurring_slots ADD COLUMN IF NOT EXISTS created_by UUID;

-- Make sure recurring_slots has unique FK name that won't conflict
ALTER TABLE public.recurring_slots DROP CONSTRAINT IF EXISTS fk_recurring_slots_dj;
ALTER TABLE public.recurring_slots ADD CONSTRAINT recurring_slots_dj_id_fkey FOREIGN KEY (dj_id) REFERENCES public.djs(id) ON DELETE SET NULL;

-- Ensure shows to djs FK has clean name
ALTER TABLE public.shows DROP CONSTRAINT IF EXISTS fk_shows_dj;
ALTER TABLE public.shows ADD CONSTRAINT shows_dj_id_fkey FOREIGN KEY (dj_id) REFERENCES public.djs(id) ON DELETE SET NULL;

-- Ensure schedules to shows FK has clean name
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS fk_schedules_show;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_show_id_fkey FOREIGN KEY (show_id) REFERENCES public.shows(id) ON DELETE CASCADE;
