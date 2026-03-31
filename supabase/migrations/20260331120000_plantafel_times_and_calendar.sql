-- Add time range support to worker_assignments
ALTER TABLE worker_assignments ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT '07:00';
ALTER TABLE worker_assignments ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT '16:00';

-- Update unique constraint to allow multiple time slots per day
ALTER TABLE worker_assignments DROP CONSTRAINT IF EXISTS worker_assignments_user_id_project_id_datum_key;
ALTER TABLE worker_assignments ADD CONSTRAINT worker_assignments_unique UNIQUE (user_id, project_id, datum, start_time);

-- Google Calendar settings
INSERT INTO public.app_settings (key, value) VALUES
  ('google_calendar_id', 'd072ed86f2ea170721f8fd46100ac8326a2a17c328a767b83591a2f16a5456aa@group.calendar.google.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
