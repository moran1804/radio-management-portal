-- Create a cron job to run audio cleanup daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-audio-files',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/cleanup-old-audio',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtubmJ2aHVrb21pYWNnY3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDUyOTcsImV4cCI6MjA3MTc4MTI5N30.kDg8tgvr6wTtergMKYykOlwvfRTc-xKVjwqulFt8F4Y"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);