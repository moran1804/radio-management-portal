-- Drop the existing check constraint that doesn't allow 'cancelled'
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Create a new check constraint that includes 'cancelled' as a valid status
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('pending', 'starting', 'running', 'ended', 'failed', 'cancelled'));