-- Add cron job to check and start/stop scheduled shows every minute
SELECT cron.schedule(
  'check-scheduled-shows',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url:='https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/check-scheduled-shows',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtubmJ2aHVrb21pYWNnY3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDUyOTcsImV4cCI6MjA3MTc4MTI5N30.kDg8tgvr6wTtergMKYykOlwvfRTc-xKVjwqulFt8F4Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);