-- Fix RLS policies on djs table to use consistent role checking
-- Drop existing admin policy that uses inconsistent role checking
DROP POLICY IF EXISTS "Admins can manage all DJs" ON public.djs;

-- Create new admin policy using the same role checking function as other tables
CREATE POLICY "Admins can manage all DJs" 
ON public.djs 
FOR ALL 
TO authenticated 
USING (
  (auth.uid() = user_id) OR (get_current_user_role() = 'ADMIN'::user_role)
)
WITH CHECK (
  (auth.uid() = user_id) OR (get_current_user_role() = 'ADMIN'::user_role)
);

-- Also ensure the individual DJ policies are properly restrictive
-- Update the read policy to be more explicit
DROP POLICY IF EXISTS "DJs can read/update own credentials" ON public.djs;

CREATE POLICY "DJs can read own credentials" 
ON public.djs 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Update insert policy to be more explicit  
DROP POLICY IF EXISTS "DJs can insert own credentials" ON public.djs;

CREATE POLICY "DJs can insert own credentials" 
ON public.djs 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Update the update policy to be more explicit
DROP POLICY IF EXISTS "DJs can update own credentials" ON public.djs;

CREATE POLICY "DJs can update own credentials" 
ON public.djs 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);