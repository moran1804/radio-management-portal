-- Fix the search path security issue first
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Update shows table policies to use the security definer function
DROP POLICY IF EXISTS "Admins can view all shows" ON public.shows;
DROP POLICY IF EXISTS "Admins can update all shows" ON public.shows;
DROP POLICY IF EXISTS "Admins can delete all shows" ON public.shows;
DROP POLICY IF EXISTS "Admins can create shows for any user" ON public.shows;

-- Recreate shows policies using the security definer function
CREATE POLICY "Admins can view all shows" 
ON public.shows 
FOR SELECT 
USING (public.get_current_user_role() = 'ADMIN' OR auth.uid() = user_id);

CREATE POLICY "Admins can update all shows" 
ON public.shows 
FOR UPDATE 
USING (public.get_current_user_role() = 'ADMIN' OR auth.uid() = user_id);

CREATE POLICY "Admins can delete all shows" 
ON public.shows 
FOR DELETE 
USING (public.get_current_user_role() = 'ADMIN' OR auth.uid() = user_id);

CREATE POLICY "Admins can create shows for any user" 
ON public.shows 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'ADMIN' OR auth.uid() = user_id);