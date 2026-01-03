-- Storage policies for DJ users to upload audio files for their own shows

-- Allow DJs to upload audio files for their own shows
CREATE POLICY "DJs can upload audio for own shows" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'show-audio' AND
  EXISTS (
    SELECT 1 FROM public.shows s
    JOIN public.djs d ON d.id = s.dj_id
    WHERE s.id::text = (storage.foldername(name))[2] -- Extract show ID from path like 'shows/show-id.ext'
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
    WHERE s.id::text = (storage.foldername(name))[2] -- Extract show ID from path like 'shows/show-id.ext'
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
    WHERE s.id::text = (storage.foldername(name))[2] -- Extract show ID from path like 'shows/show-id.ext'
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
    WHERE s.id::text = (storage.foldername(name))[2] -- Extract show ID from path like 'shows/show-id.ext'
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