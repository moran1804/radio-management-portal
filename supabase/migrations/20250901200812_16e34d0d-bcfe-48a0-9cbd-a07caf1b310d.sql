-- Set up cron job to generate recurring shows daily at 6 AM
SELECT cron.schedule(
  'generate-recurring-shows',
  '0 6 * * *', -- Daily at 6 AM
  $$
  SELECT net.http_post(
    url:='https://rihknnbvhukomiacgcxp.supabase.co/functions/v1/generate-recurring-shows',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpaGtubmJ2aHVrb21pYWNnY3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDUyOTcsImV4cCI6MjA3MTc4MTI5N30.kDg8tgvr6wTtergMKYykOlwvfRTc-xKVjwqulFt8F4Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);