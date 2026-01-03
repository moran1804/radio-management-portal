-- Clean up orphaned schedules and jobs for shows that are now 'live'
-- First delete jobs for schedules of live shows
DELETE FROM jobs 
WHERE schedule_id IN (
  SELECT s.id 
  FROM schedules s 
  JOIN shows sh ON s.show_id = sh.id 
  WHERE sh.show_type = 'live'
);

-- Then delete schedules for live shows
DELETE FROM schedules 
WHERE show_id IN (
  SELECT id FROM shows WHERE show_type = 'live'
);

-- Update live shows to remove file paths and ensure proper status
UPDATE shows 
SET 
  file_path = NULL,
  storage_path = NULL,
  status = 'pending'
WHERE show_type = 'live' 
  AND (file_path IS NOT NULL OR storage_path IS NOT NULL OR status != 'pending');