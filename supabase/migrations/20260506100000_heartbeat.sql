-- Keep-alive: verhindert dass Supabase Free-Tier nach 7 Tagen pausiert
-- Strategie: pg_cron Job alle 6h, der die DB updated UND einen HTTP-Ping an die eigene PostgREST-API macht (zählt 100% als API-Aktivität).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Heartbeat-Tabelle (Singleton-Row)
CREATE TABLE IF NOT EXISTS public.heartbeat (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  last_ping   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ping_count  BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT heartbeat_singleton CHECK (id = 1)
);

INSERT INTO public.heartbeat (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.heartbeat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS heartbeat_admin_read ON public.heartbeat;
CREATE POLICY heartbeat_admin_read ON public.heartbeat
  FOR SELECT USING (public.is_admin());

-- Funktion: DB-Update + HTTP-Ping (HTTP-Fehler werden geschluckt)
CREATE OR REPLACE FUNCTION public.heartbeat_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.heartbeat
     SET last_ping  = now(),
         ping_count = ping_count + 1
   WHERE id = 1;

  BEGIN
    PERFORM net.http_get(
      url := 'https://jyjhtqnkirsxyzsnwlmx.supabase.co/rest/v1/heartbeat?id=eq.1&select=id',
      headers := jsonb_build_object(
        'apikey', 'sb_publishable_srcKETM2AH9XjhzLLz7JGg_dfOcJJJ6',
        'Authorization', 'Bearer sb_publishable_srcKETM2AH9XjhzLLz7JGg_dfOcJJJ6'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Existierenden Job löschen falls vorhanden, dann neu schedulen
DO $$
DECLARE existing_jobid BIGINT;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'heartbeat-tick';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
END $$;

-- Job: alle 6 Stunden um Minute 0
SELECT cron.schedule(
  'heartbeat-tick',
  '0 */6 * * *',
  $job$SELECT public.heartbeat_tick();$job$
);

-- Direkt einmal initial triggern
SELECT public.heartbeat_tick();
