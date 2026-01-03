-- Create storage bucket for MP3 files
INSERT INTO storage.buckets (id, name, public) VALUES ('show-audio', 'show-audio', false);

-- Add file_path column to shows table for MP3 files
ALTER TABLE public.shows ADD COLUMN file_path TEXT;
ALTER TABLE public.shows ADD COLUMN scheduled_by UUID REFERENCES auth.users(id);

-- Create storage policies for show audio files
CREATE POLICY "Admins can upload show audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'show-audio' AND get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Admins can view show audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'show-audio' AND get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Admins can update show audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'show-audio' AND get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Admins can delete show audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'show-audio' AND get_current_user_role() = 'ADMIN'::user_role);

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION public.check_show_conflict(
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_show_id UUID DEFAULT NULL
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shows 
    WHERE status != 'cancelled' 
    AND id != COALESCE(p_exclude_show_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;