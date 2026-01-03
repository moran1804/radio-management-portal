-- Fix the check_show_conflict function to work without the status column
-- Since we removed status from shows, we need to check conflicts differently
-- We'll check against schedules instead of shows for conflicts
CREATE OR REPLACE FUNCTION public.check_show_conflict(p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_show_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check for conflicts in schedules instead of shows
  -- A conflict exists if there are overlapping scheduled shows that aren't cancelled
  RETURN EXISTS (
    SELECT 1 FROM public.schedules s
    JOIN public.shows sh ON sh.id = s.show_id
    WHERE s.status != 'cancelled' 
    AND sh.id != COALESCE(p_exclude_show_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (s.starts_at <= p_start_time AND s.ends_at > p_start_time) OR
      (s.starts_at < p_end_time AND s.ends_at >= p_end_time) OR
      (s.starts_at >= p_start_time AND s.ends_at <= p_end_time)
    )
  );
END;
$function$