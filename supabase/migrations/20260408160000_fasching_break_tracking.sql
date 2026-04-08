-- FASCHING Gebäudetechnik: Break tracking, vacation credits, project customer fields

-- Break tracking on time entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS has_breakfast_break boolean DEFAULT false;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS has_lunch_break boolean DEFAULT false;

-- Break tracking on disturbances (Arbeitsberichte)
ALTER TABLE public.disturbances ADD COLUMN IF NOT EXISTS has_breakfast_break boolean DEFAULT false;
ALTER TABLE public.disturbances ADD COLUMN IF NOT EXISTS has_lunch_break boolean DEFAULT false;

-- Vacation credit settings per employee
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS vacation_credit_month integer;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS vacation_days_per_year integer DEFAULT 25;

-- Source tracking for vacation adjustments (manual vs auto)
ALTER TABLE public.vacation_adjustments ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Customer fields on projects (for Arbeitsbericht auto-fill)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS kunde_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS kunde_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS kunde_telefon text;

-- Comments
COMMENT ON COLUMN public.employees.vacation_credit_month IS 'Monat (1-12) in dem der Jahresurlaub gutgeschrieben wird';
COMMENT ON COLUMN public.employees.vacation_days_per_year IS 'Anzahl Urlaubstage pro Jahr (Standard: 25)';
COMMENT ON COLUMN public.vacation_adjustments.source IS 'manual = Admin-Korrektur, auto = automatische Jahresgutschrift';
COMMENT ON COLUMN public.time_entries.has_breakfast_break IS 'Vormittagspause 09:00-09:15 (zaehlt als Arbeitszeit)';
COMMENT ON COLUMN public.time_entries.has_lunch_break IS 'Mittagspause 12:00-12:30 (zaehlt NICHT als Arbeitszeit)';
