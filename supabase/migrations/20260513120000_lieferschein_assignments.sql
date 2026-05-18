-- Lieferschein-Zuweisung Admin → Mitarbeiter

ALTER TABLE public.lieferscheine
  ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN assigned_at TIMESTAMPTZ;

CREATE INDEX lieferscheine_assigned_to_idx ON public.lieferscheine (assigned_to);

-- ============================================================================
-- RLS: SELECT/UPDATE erweitern auf assigned_to. DELETE bleibt am Ersteller.
-- ============================================================================

DROP POLICY IF EXISTS ls_select_own_or_admin ON public.lieferscheine;
CREATE POLICY ls_select_own_or_admin ON public.lieferscheine
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
    OR public.is_admin()
  );

DROP POLICY IF EXISTS ls_update_own_draft ON public.lieferscheine;
CREATE POLICY ls_update_own_draft ON public.lieferscheine
  FOR UPDATE
  USING (
    (auth.uid() = user_id OR auth.uid() = assigned_to)
    AND status = 'entwurf'
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = assigned_to
  );

-- ls_delete_own_draft bleibt: nur eigener Entwurf darf gelöscht werden.

-- ============================================================================
-- Positionen: same Logic
-- ============================================================================

DROP POLICY IF EXISTS pos_select ON public.lieferschein_positionen;
CREATE POLICY pos_select ON public.lieferschein_positionen
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (l.user_id = auth.uid() OR l.assigned_to = auth.uid() OR public.is_admin())
  ));

DROP POLICY IF EXISTS pos_insert ON public.lieferschein_positionen;
CREATE POLICY pos_insert ON public.lieferschein_positionen
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (((l.user_id = auth.uid() OR l.assigned_to = auth.uid()) AND l.status = 'entwurf')
            OR public.is_admin())
  ));

DROP POLICY IF EXISTS pos_update ON public.lieferschein_positionen;
CREATE POLICY pos_update ON public.lieferschein_positionen
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (((l.user_id = auth.uid() OR l.assigned_to = auth.uid()) AND l.status = 'entwurf')
            OR public.is_admin())
  ));

DROP POLICY IF EXISTS pos_delete ON public.lieferschein_positionen;
CREATE POLICY pos_delete ON public.lieferschein_positionen
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (((l.user_id = auth.uid() OR l.assigned_to = auth.uid()) AND l.status = 'entwurf')
            OR public.is_admin())
  ));

-- ============================================================================
-- replace_lieferschein_positionen RPC: assigned_to mit erlaubt
-- ============================================================================

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
       AND (((l.user_id = auth.uid() OR l.assigned_to = auth.uid()) AND l.status = 'entwurf')
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

-- ============================================================================
-- Storage: SELECT für alle aktiven User (Pfade UUID-basiert, unguessable)
-- INSERT/UPDATE/DELETE bleiben restriktiv (auth.uid() = first folder)
-- ============================================================================

DROP POLICY IF EXISTS sig_owner_read ON storage.objects;
CREATE POLICY sig_signatures_read_active ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lieferschein-signatures'
    AND EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.is_active)
  );
