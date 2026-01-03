-- Add status column to shows table for tracking show states
ALTER TABLE public.shows 
ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed', 'cancelled'));

-- Update existing shows to have proper status based on their current state
UPDATE public.shows 
SET status = CASE 
  WHEN show_type = 'prerecorded' AND file_path IS NOT NULL THEN 'scheduled'
  WHEN show_type = 'live' THEN 'pending'
  ELSE 'pending'
END;

-- Create index for better performance on status queries
CREATE INDEX idx_shows_status_start_time ON public.shows(status, start_time);
CREATE INDEX idx_shows_status_end_time ON public.shows(status, end_time);