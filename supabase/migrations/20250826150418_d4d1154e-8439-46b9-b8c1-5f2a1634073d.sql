-- Add streaming configuration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN icecast_address TEXT DEFAULT 'mystation.micast.media',
ADD COLUMN icecast_port INTEGER DEFAULT 8025,
ADD COLUMN icecast_mountpoint TEXT DEFAULT '/';