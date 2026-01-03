-- Add RLS policy to allow DJs to create jobs for their own shows
CREATE POLICY "DJs can create jobs for own shows" 
ON public.jobs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM schedules s
    JOIN shows sh ON sh.id = s.show_id
    JOIN djs d ON d.id = sh.dj_id
    WHERE s.id = jobs.schedule_id 
    AND d.user_id = auth.uid()
  )
);