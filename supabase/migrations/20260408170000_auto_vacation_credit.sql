-- Automatische Urlaubsgutschrift: Läuft am 1. jedes Monats
-- Prüft ob der vacation_credit_month des Mitarbeiters dem aktuellen Monat entspricht
-- Erstellt einen vacation_adjustments Eintrag mit source='auto'

CREATE OR REPLACE FUNCTION public.auto_credit_vacation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month_num integer := EXTRACT(MONTH FROM now());
  current_year_num integer := EXTRACT(YEAR FROM now());
  emp RECORD;
BEGIN
  FOR emp IN
    SELECT e.user_id, e.vacation_days_per_year, e.vacation_credit_month, e.vorname, e.nachname
    FROM public.employees e
    WHERE e.vacation_credit_month = current_month_num
      AND e.user_id IS NOT NULL
      AND (e.austritt_datum IS NULL OR e.austritt_datum > now()::date)
      AND COALESCE(e.vacation_days_per_year, 25) > 0
  LOOP
    -- Prüfe ob bereits dieses Jahr im selben Monat gutgeschrieben wurde
    IF NOT EXISTS (
      SELECT 1 FROM public.vacation_adjustments va
      WHERE va.user_id = emp.user_id
        AND va.source = 'auto'
        AND EXTRACT(YEAR FROM va.created_at) = current_year_num
        AND EXTRACT(MONTH FROM va.created_at) = current_month_num
    ) THEN
      INSERT INTO public.vacation_adjustments (user_id, days, reason, adjusted_by, source)
      VALUES (
        emp.user_id,
        COALESCE(emp.vacation_days_per_year, 25),
        'Jahresurlaub ' || current_year_num || ' – ' || emp.vorname || ' ' || emp.nachname || ' (automatisch)',
        emp.user_id,
        'auto'
      );

      RAISE NOTICE 'Urlaubsgutschrift für % %: % Tage', emp.vorname, emp.nachname, COALESCE(emp.vacation_days_per_year, 25);
    END IF;
  END LOOP;
END;
$$;

-- Hinweis: pg_cron muss im Supabase Dashboard aktiviert werden
-- Dann diesen Befehl im SQL Editor ausführen:
-- SELECT cron.schedule('auto-vacation-credit', '0 0 1 * *', 'SELECT public.auto_credit_vacation()');
