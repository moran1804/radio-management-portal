-- Add missing foreign key constraint between shows and profiles tables
ALTER TABLE public.shows 
ADD CONSTRAINT shows_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;