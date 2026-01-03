-- Create recurring_slots table for weekly recurring DJ assignments
CREATE TABLE public.recurring_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID -- admin who created this slot
);

-- Add show_type and recurring_slot_id to shows table
ALTER TABLE public.shows 
ADD COLUMN show_type TEXT DEFAULT 'live' CHECK (show_type IN ('live', 'prerecorded')),
ADD COLUMN recurring_slot_id UUID REFERENCES public.recurring_slots(id);

-- Enable RLS on recurring_slots
ALTER TABLE public.recurring_slots ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_slots
CREATE POLICY "DJs can view their own recurring slots" 
ON public.recurring_slots 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.djs d 
    WHERE d.id = recurring_slots.dj_id AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all recurring slots" 
ON public.recurring_slots 
FOR ALL 
USING (get_current_user_role() = 'ADMIN'::user_role)
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

-- Create updated_at trigger for recurring_slots
CREATE TRIGGER update_recurring_slots_updated_at
BEFORE UPDATE ON public.recurring_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate shows from recurring slots
CREATE OR REPLACE FUNCTION public.generate_recurring_shows(
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_weeks_ahead INTEGER DEFAULT 2
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_record RECORD;
  target_date DATE;
  show_start TIMESTAMP WITH TIME ZONE;
  show_end TIMESTAMP WITH TIME ZONE;
  existing_show_count INTEGER;
  generated_count INTEGER := 0;
BEGIN
  -- Loop through each active recurring slot
  FOR slot_record IN 
    SELECT * FROM public.recurring_slots 
    WHERE is_active = true
  LOOP
    -- Generate shows for the next p_weeks_ahead weeks
    FOR week_offset IN 0..p_weeks_ahead-1 LOOP
      -- Calculate the target date for this slot
      target_date := p_start_date + (week_offset * 7) + (slot_record.day_of_week - EXTRACT(DOW FROM p_start_date)::INTEGER);
      
      -- Skip if target date is in the past
      IF target_date < CURRENT_DATE THEN
        CONTINUE;
      END IF;
      
      -- Calculate show start and end times
      show_start := target_date + slot_record.start_time;
      show_end := show_start + (slot_record.duration_minutes || ' minutes')::INTERVAL;
      
      -- Check if a show already exists for this recurring slot at this time
      SELECT COUNT(*) INTO existing_show_count
      FROM public.shows
      WHERE recurring_slot_id = slot_record.id
        AND start_time = show_start;
      
      -- Only create show if it doesn't already exist
      IF existing_show_count = 0 THEN
        INSERT INTO public.shows (
          title,
          description,
          start_time,
          end_time,
          user_id,
          dj_id,
          show_type,
          recurring_slot_id,
          duration_seconds
        ) VALUES (
          slot_record.title,
          slot_record.description,
          show_start,
          show_end,
          (SELECT user_id FROM public.djs WHERE id = slot_record.dj_id),
          slot_record.dj_id,
          'live', -- default to live
          slot_record.id,
          slot_record.duration_minutes * 60
        );
        
        generated_count := generated_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN generated_count;
END;
$$;