-- Add profile picture and bio columns to djs table
ALTER TABLE public.djs 
ADD COLUMN bio TEXT,
ADD COLUMN profile_picture_url TEXT;

-- Create storage bucket for DJ profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dj-profiles', 'dj-profiles', true);

-- Create policies for DJ profile pictures
CREATE POLICY "DJ profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'dj-profiles');

CREATE POLICY "DJs can upload their own profile picture" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'dj-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "DJs can update their own profile picture" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'dj-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "DJs can delete their own profile picture" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'dj-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);