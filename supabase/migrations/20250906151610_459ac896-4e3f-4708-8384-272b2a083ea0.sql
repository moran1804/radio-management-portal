-- Add policy to allow DJs to view all shows (for calendar functionality)
CREATE POLICY "DJs can view all shows for calendar" 
ON public.shows 
FOR SELECT 
TO authenticated 
USING (true);