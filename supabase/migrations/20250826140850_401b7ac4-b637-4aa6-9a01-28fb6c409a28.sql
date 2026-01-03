-- Fix infinite recursion in RLS policies by using the get_current_user_role function instead of direct profile queries

-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new admin view policy using the get_current_user_role function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (get_current_user_role() = 'ADMIN'::user_role)
);