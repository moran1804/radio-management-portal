-- Allow DJs to reassign shows they currently own to another DJ
-- This policy lets a DJ update a show if they are the CURRENT owner (based on the existing row),
-- and allows the new row to pass without restriction so dj_id can change to someone else.
CREATE POLICY "DJs can reassign owned shows" 
ON public.shows
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.djs d
    WHERE d.id = shows.dj_id AND d.user_id = auth.uid()
  )
)
WITH CHECK (true);