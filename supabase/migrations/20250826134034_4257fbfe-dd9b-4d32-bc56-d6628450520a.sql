-- Temporarily simplify the policies to diagnose the issue
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create simple, working policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR (
  SELECT role FROM public.profiles WHERE user_id = auth.uid() AND role = 'ADMIN'
) IS NOT NULL);