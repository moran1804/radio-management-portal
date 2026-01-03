-- Update djs table to match existing credentials structure and migrate data
ALTER TABLE public.djs 
DROP COLUMN IF EXISTS ice_user,
DROP COLUMN IF EXISTS ice_pass_enc,
DROP COLUMN IF EXISTS mount,
ADD COLUMN IF NOT EXISTS icecast_address text DEFAULT 'mystation.micast.media',
ADD COLUMN IF NOT EXISTS icecast_port integer DEFAULT 8025,
ADD COLUMN IF NOT EXISTS icecast_mountpoint text DEFAULT '/',
ADD COLUMN IF NOT EXISTS icecast_username text,
ADD COLUMN IF NOT EXISTS icecast_password_encrypted text;

-- Migrate existing credentials from profiles to djs table
INSERT INTO public.djs (user_id, display_name, icecast_address, icecast_port, icecast_mountpoint, icecast_username, icecast_password_encrypted)
SELECT 
  p.user_id,
  p.name as display_name,
  COALESCE(p.icecast_address, 'mystation.micast.media'),
  COALESCE(p.icecast_port, 8025),
  COALESCE(p.icecast_mountpoint, '/'),
  p.icecast_username,
  p.icecast_password_encrypted
FROM public.profiles p
WHERE p.icecast_username IS NOT NULL 
AND p.icecast_password_encrypted IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.djs d WHERE d.user_id = p.user_id);