-- Update the specific user to be an admin once they sign up
-- This will run after the user moran1804@gmail.com creates their account
CREATE OR REPLACE FUNCTION public.set_initial_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'ADMIN'
  WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'moran1804@gmail.com'
  );
END;
$$;