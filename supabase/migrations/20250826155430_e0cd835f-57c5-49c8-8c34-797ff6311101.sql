-- Move extensions from public schema to extensions schema for security
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

-- Create extensions in the extensions schema instead of public
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the cron job with proper schema reference
SELECT extensions.cron.schedule(
  'check-scheduled-shows',
  '* * * * *', -- Every minute
  $$
  SELECT extensions.net.http_post(
    url:='https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/check-scheduled-shows',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtubmJ2aHVrb21pYWNnY3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDUyOTcsImV4cCI6MjA3MTc4MTI5N30.kDg8tgvr6wTtergMKYykOlwvfRTc-xKVjwqulFt8F4Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);