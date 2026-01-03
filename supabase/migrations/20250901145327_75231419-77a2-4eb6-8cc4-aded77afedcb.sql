-- Remove status column from shows table since we'll use the status from schedules instead
ALTER TABLE public.shows DROP COLUMN status;