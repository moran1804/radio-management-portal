-- Fix storage RLS policies for show-audio bucket

-- Drop the problematic policies first
DROP POLICY IF EXISTS "DJs can upload audio for own shows" ON storage.objects;
DROP POLICY IF EXISTS "DJs can view audio for own shows" ON storage.objects;
DROP POLICY IF EXISTS "DJs can update audio for own shows" ON storage.objects;
DROP POLICY IF EXISTS "DJs can delete audio for own shows" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all show audio files" ON storage.objects;

-- Create corrected policies that properly extract show ID from filename
-- The file path is: shows/show-id.ext, so we need to extract show-id from the filename

-- Allow DJs to upload audio files for their own shows
CREATE POLICY "DJs can upload audio for own shows" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.shows s
    JOIN public.djs d ON d.id = s.dj_id
    WHERE s.id::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '.', 1) -- Extract show ID from 'shows/show-id.ext'
    AND d.user_id = auth.uid()
  )
);

-- Allow DJs to view audio files for their own shows
CREATE POLICY "DJs can view audio for own shows" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.shows s
    JOIN public.djs d ON d.id = s.dj_id
    WHERE s.id::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '.', 1) -- Extract show ID from 'shows/show-id.ext'
    AND d.user_id = auth.uid()
  )
);

-- Allow DJs to update/replace audio files for their own shows
CREATE POLICY "DJs can update audio for own shows" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.shows s
    JOIN public.djs d ON d.id = s.dj_id
    WHERE s.id::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '.', 1) -- Extract show ID from 'shows/show-id.ext'
    AND d.user_id = auth.uid()
  )
);

-- Allow DJs to delete audio files for their own shows
CREATE POLICY "DJs can delete audio for own shows" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.shows s
    JOIN public.djs d ON d.id = s.dj_id
    WHERE s.id::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '.', 1) -- Extract show ID from 'shows/show-id.ext'
    AND d.user_id = auth.uid()
  )
);

-- Allow admins to manage all files in show-audio bucket
CREATE POLICY "Admins can manage all show audio files" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'ADMIN'
  )
)
WITH CHECK (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'ADMIN'
  )
);