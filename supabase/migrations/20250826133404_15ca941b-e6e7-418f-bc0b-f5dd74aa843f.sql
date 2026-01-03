-- Drop all policies that depend on the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all shows" ON public.shows;
DROP POLICY IF EXISTS "Admins can update all shows" ON public.shows;
DROP POLICY IF EXISTS "Admins can delete all shows" ON public.shows;
DROP POLICY IF EXISTS "Admins can create shows for any user" ON public.shows;

-- Now drop and recreate the function with proper search path
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate all policies using the fixed function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'ADMIN' OR auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.get_current_user_role() = 'ADMIN' OR auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'ADMIN');

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