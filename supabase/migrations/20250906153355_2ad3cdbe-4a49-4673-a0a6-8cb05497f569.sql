-- Add policy to allow all authenticated users to view profile names (for calendar DJ names)
CREATE POLICY "All authenticated users can view profile names" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);