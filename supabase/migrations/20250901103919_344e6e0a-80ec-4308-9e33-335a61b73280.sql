-- Fix infinite recursion in user_roles policies
-- First drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Create simple, non-recursive policies
-- Users can read their own role
CREATE POLICY "Users can read own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Instead of referencing user_roles table in admin policies, use the profiles table
-- Admins can read all roles (using profiles table to avoid recursion)
CREATE POLICY "Admins can read all roles" ON user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'ADMIN'
  ) OR auth.uid() = user_roles.user_id
);

-- Admins can manage all roles (using profiles table to avoid recursion)
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'ADMIN'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'ADMIN'
  )
);