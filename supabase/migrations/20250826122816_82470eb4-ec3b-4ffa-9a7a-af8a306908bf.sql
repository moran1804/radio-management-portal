-- Create shows table for DJ scheduling
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;

-- Create policies for shows access
CREATE POLICY "Users can view their own shows" 
ON public.shows 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shows" 
ON public.shows 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shows" 
ON public.shows 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shows" 
ON public.shows 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all shows
CREATE POLICY "Admins can view all shows" 
ON public.shows 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'ADMIN'
));

-- Admins can create shows for any user
CREATE POLICY "Admins can create shows for any user" 
ON public.shows 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'ADMIN'
));

-- Admins can update all shows
CREATE POLICY "Admins can update all shows" 
ON public.shows 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'ADMIN'
));

-- Admins can delete all shows
CREATE POLICY "Admins can delete all shows" 
ON public.shows 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'ADMIN'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shows_updated_at
BEFORE UPDATE ON public.shows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample shows for demonstration
INSERT INTO public.shows (user_id, title, description, start_time, end_time, status) VALUES
((SELECT user_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1), 
 'Morning Drive', 
 'Wake up with the best music and local news', 
 (CURRENT_DATE + INTERVAL '1 day' + TIME '06:00:00') AT TIME ZONE 'UTC',
 (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00:00') AT TIME ZONE 'UTC',
 'scheduled'),
 
((SELECT user_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1), 
 'Evening Mix', 
 'Relaxing tunes to end your day', 
 (CURRENT_DATE + TIME '19:00:00') AT TIME ZONE 'UTC',
 (CURRENT_DATE + TIME '22:00:00') AT TIME ZONE 'UTC',
 'scheduled'),
 
((SELECT user_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1), 
 'Weekend Special', 
 'Special weekend programming', 
 (CURRENT_DATE + INTERVAL '2 days' + TIME '14:00:00') AT TIME ZONE 'UTC',
 (CURRENT_DATE + INTERVAL '2 days' + TIME '16:00:00') AT TIME ZONE 'UTC',
 'scheduled');