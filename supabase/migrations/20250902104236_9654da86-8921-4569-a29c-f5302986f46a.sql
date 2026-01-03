-- Update the generate_recurring_shows function to default to 3 weeks ahead
CREATE OR REPLACE FUNCTION public.generate_recurring_shows(p_start_date date DEFAULT CURRENT_DATE, p_weeks_ahead integer DEFAULT 3)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Generate shows for the next p_weeks_ahead weeks (now defaults to 3)
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
$function$;

-- Create a weekly cron job to automatically generate new shows every Sunday at midnight
-- This ensures users always have 3 weeks of shows to manage
SELECT cron.schedule(
  'generate-weekly-recurring-shows',
  '0 0 * * 0', -- Every Sunday at midnight
  $$
  SELECT
    net.http_post(
        url:='https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/generate-recurring-shows',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtubmJ2aHVrb21pYWNnY3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDUyOTcsImV4cCI6MjA3MTc4MTI5N30.kDg8tgvr6wTtergMKYykOlwvfRTc-xKVjwqulFt8F4Y"}'::jsonb,
        body:=concat('{"weeks_ahead": 3}')::jsonb
    ) as request_id;
  $$
);