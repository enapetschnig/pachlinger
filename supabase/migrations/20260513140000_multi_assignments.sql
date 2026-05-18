-- Multi-Assignment: assigned_to UUID → UUID[]
-- Reihenfolge: Policies droppen → Typ ändern → Policies + RPC mit ANY() neu

-- Phase 0: Foreign Key droppen (kann auf Array-Spalte nicht referenzieren)
ALTER TABLE public.lieferscheine
  DROP CONSTRAINT IF EXISTS lieferscheine_assigned_to_fkey;

-- Phase 1: alle abhängigen Policies entfernen
DROP POLICY IF EXISTS ls_select_own_or_admin ON public.lieferscheine;
DROP POLICY IF EXISTS ls_update_own_draft ON public.lieferscheine;
DROP POLICY IF EXISTS pos_select ON public.lieferschein_positionen;
DROP POLICY IF EXISTS pos_insert ON public.lieferschein_positionen;
DROP POLICY IF EXISTS pos_update ON public.lieferschein_positionen;
DROP POLICY IF EXISTS pos_delete ON public.lieferschein_positionen;

-- Phase 2: Typ-Wechsel mit Werte-Migration (UUID → UUID[])
ALTER TABLE public.lieferscheine
  ALTER COLUMN assigned_to DROP NOT NULL,
  ALTER COLUMN assigned_to TYPE UUID[]
    USING (CASE WHEN assigned_to IS NULL THEN '{}'::UUID[] ELSE ARRAY[assigned_to] END);

ALTER TABLE public.lieferscheine
  ALTER COLUMN assigned_to SET DEFAULT '{}',
  ALTER COLUMN assigned_to SET NOT NULL;

DROP INDEX IF EXISTS lieferscheine_assigned_to_idx;
CREATE INDEX lieferscheine_assigned_to_idx
  ON public.lieferscheine USING GIN (assigned_to);

-- Phase 3: Policies mit ANY()-Check neu anlegen
CREATE POLICY ls_select_own_or_admin ON public.lieferscheine
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = ANY(assigned_to)
    OR public.is_admin()
  );

CREATE POLICY ls_update_own_draft ON public.lieferscheine
  FOR UPDATE
  USING (
    (auth.uid() = user_id OR auth.uid() = ANY(assigned_to))
    AND status = 'entwurf'
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = ANY(assigned_to)
  );

CREATE POLICY pos_select ON public.lieferschein_positionen
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (l.user_id = auth.uid() OR auth.uid() = ANY(l.assigned_to) OR public.is_admin())
  ));

CREATE POLICY pos_insert ON public.lieferschein_positionen
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (((l.user_id = auth.uid() OR auth.uid() = ANY(l.assigned_to)) AND l.status = 'entwurf')
            OR public.is_admin())
  ));

CREATE POLICY pos_update ON public.lieferschein_positionen
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (((l.user_id = auth.uid() OR auth.uid() = ANY(l.assigned_to)) AND l.status = 'entwurf')
            OR public.is_admin())
  ));

CREATE POLICY pos_delete ON public.lieferschein_positionen
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (((l.user_id = auth.uid() OR auth.uid() = ANY(l.assigned_to)) AND l.status = 'entwurf')
            OR public.is_admin())
  ));

-- Phase 4: RPC aktualisieren
CREATE OR REPLACE FUNCTION public.replace_lieferschein_positionen(
  _lieferschein_id UUID,
  _positionen JSONB
) RETURNS void
LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  pos JSONB;
  idx INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = _lieferschein_id
       AND (((l.user_id = auth.uid() OR auth.uid() = ANY(l.assigned_to)) AND l.status = 'entwurf')
            OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.lieferschein_positionen WHERE lieferschein_id = _lieferschein_id;

  FOR pos IN SELECT * FROM jsonb_array_elements(_positionen) LOOP
    idx := idx + 1;
    INSERT INTO public.lieferschein_positionen
      (lieferschein_id, pos_nr, menge, einheit, bezeichnung, rabatt_eur)
    VALUES (
      _lieferschein_id, idx,
      (pos->>'menge')::NUMERIC,
      pos->>'einheit',
      pos->>'bezeichnung',
      CASE WHEN pos->>'rabatt_eur' IS NULL OR pos->>'rabatt_eur' = ''
           THEN NULL
           ELSE (pos->>'rabatt_eur')::NUMERIC END
    );
  END LOOP;
END $$;
