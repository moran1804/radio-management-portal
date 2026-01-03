-- Create table for streaming credentials
CREATE TABLE public.streaming_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'Icecast',
  address TEXT NOT NULL DEFAULT 'mystation.micast.media',
  port INTEGER NOT NULL DEFAULT 8025,
  password TEXT NOT NULL DEFAULT '',
  mountpoint TEXT NOT NULL DEFAULT '/live',
  username TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.streaming_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view streaming credentials" 
ON public.streaming_credentials 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage streaming credentials" 
ON public.streaming_credentials 
FOR ALL 
USING (get_current_user_role() = 'ADMIN'::user_role)
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_streaming_credentials_updated_at
BEFORE UPDATE ON public.streaming_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default streaming credentials
INSERT INTO public.streaming_credentials (type, address, port, password, mountpoint, username)
VALUES ('Icecast', 'mystation.micast.media', 8025, '', '/live', '');