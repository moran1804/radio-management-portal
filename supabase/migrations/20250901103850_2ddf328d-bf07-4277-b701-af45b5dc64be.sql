-- Fix infinite recursion in user_roles policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Create non-recursive policies
-- Users can read their own role
CREATE POLICY "Users can read own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all roles (for admin functions)
CREATE POLICY "Service role can manage roles" ON user_roles
FOR ALL USING (current_setting('role') = 'service_role');

-- Allow inserts for new user creation
CREATE POLICY "Allow role creation" ON user_roles
FOR INSERT WITH CHECK (true);