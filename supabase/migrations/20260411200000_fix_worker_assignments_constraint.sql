-- Fix: Duplicate UNIQUE constraint on worker_assignments
-- worker_assignments_user_id_datum_key prevented multiple assignments per user/day
-- worker_assignments_unique (user_id, project_id, datum, start_time) is the correct one

ALTER TABLE public.worker_assignments DROP CONSTRAINT IF EXISTS worker_assignments_user_id_datum_key;
