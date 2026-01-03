-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.check_show_conflict(
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_show_id UUID DEFAULT NULL
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shows 
    WHERE status != 'cancelled' 
    AND id != COALESCE(p_exclude_show_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;