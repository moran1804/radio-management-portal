-- Add missing columns to shows table
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add missing columns to recurring_slots table
ALTER TABLE public.recurring_slots ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.recurring_slots ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add foreign key constraints for proper typing of joins
ALTER TABLE public.shows ADD CONSTRAINT fk_shows_dj FOREIGN KEY (dj_id) REFERENCES public.djs(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_slots ADD CONSTRAINT fk_recurring_slots_dj FOREIGN KEY (dj_id) REFERENCES public.djs(id) ON DELETE SET NULL;
ALTER TABLE public.schedules ADD CONSTRAINT fk_schedules_show FOREIGN KEY (show_id) REFERENCES public.shows(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD CONSTRAINT fk_jobs_schedule FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD CONSTRAINT fk_jobs_show FOREIGN KEY (show_id) REFERENCES public.shows(id) ON DELETE CASCADE;
ALTER TABLE public.show_recordings ADD CONSTRAINT fk_show_recordings_show FOREIGN KEY (show_id) REFERENCES public.shows(id) ON DELETE CASCADE;

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_shows_user_id ON public.shows(user_id);
CREATE INDEX IF NOT EXISTS idx_shows_start_time ON public.shows(start_time);
CREATE INDEX IF NOT EXISTS idx_shows_end_time ON public.shows(end_time);
CREATE INDEX IF NOT EXISTS idx_shows_dj_id ON public.shows(dj_id);
