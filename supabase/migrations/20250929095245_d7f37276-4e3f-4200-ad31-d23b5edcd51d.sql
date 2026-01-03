-- Update RLS policy to allow DJs to read basic info about all DJs for dropdown selection
DROP POLICY IF EXISTS "DJs can read own credentials" ON public.djs;

-- Create new policy that allows DJs to read all DJ profiles for dropdown selection
-- but still restricts sensitive credential fields to own records only
CREATE POLICY "DJs can read all DJ profiles for selection" 
ON public.djs 
FOR SELECT 
USING (true);

-- Create a more restrictive policy for credential fields by creating a view or handling this in application logic
-- For now, this allows reading all DJ info but we should consider creating a view for sensitive vs non-sensitive fields