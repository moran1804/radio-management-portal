-- Update default mount point to /live for profiles table
ALTER TABLE public.profiles 
ALTER COLUMN icecast_mountpoint SET DEFAULT '/live';

-- Update default mount point to /live for djs table  
ALTER TABLE public.djs 
ALTER COLUMN icecast_mountpoint SET DEFAULT '/live';

-- Update existing users who have the old default
UPDATE public.profiles 
SET icecast_mountpoint = '/live' 
WHERE icecast_mountpoint = '/';

UPDATE public.djs 
SET icecast_mountpoint = '/live' 
WHERE icecast_mountpoint = '/';