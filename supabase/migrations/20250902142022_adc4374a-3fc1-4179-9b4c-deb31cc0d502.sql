-- Fix RLS policy for jobs table to allow admins from profiles table
DROP POLICY IF EXISTS "Admins can manage all jobs" ON jobs;

CREATE POLICY "Admins can manage all jobs" 
ON jobs 
FOR ALL 
USING (
  (get_current_user_role() = 'ADMIN'::user_role) OR
  (EXISTS ( 
    SELECT 1
    FROM ((schedules s JOIN shows sh ON sh.id = s.show_id) JOIN djs d ON d.id = sh.dj_id)
    WHERE s.id = jobs.schedule_id AND d.user_id = auth.uid()
  ))
)
WITH CHECK (
  (get_current_user_role() = 'ADMIN'::user_role) OR
  (EXISTS ( 
    SELECT 1
    FROM ((schedules s JOIN shows sh ON sh.id = s.show_id) JOIN djs d ON d.id = sh.dj_id)
    WHERE s.id = jobs.schedule_id AND d.user_id = auth.uid()
  ))
);