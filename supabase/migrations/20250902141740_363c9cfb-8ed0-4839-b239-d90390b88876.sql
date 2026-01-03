-- Fix RLS policy for schedules table to allow admins from profiles table
DROP POLICY IF EXISTS "Admins can manage all schedules" ON schedules;

CREATE POLICY "Admins can manage all schedules" 
ON schedules 
FOR ALL 
USING (
  (get_current_user_role() = 'ADMIN'::user_role) OR
  (EXISTS ( 
    SELECT 1
    FROM (shows s JOIN djs d ON d.id = s.dj_id)
    WHERE s.id = schedules.show_id AND d.user_id = auth.uid()
  ))
)
WITH CHECK (
  (get_current_user_role() = 'ADMIN'::user_role) OR
  (EXISTS ( 
    SELECT 1
    FROM (shows s JOIN djs d ON d.id = s.dj_id)
    WHERE s.id = schedules.show_id AND d.user_id = auth.uid()
  ))
);