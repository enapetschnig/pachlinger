-- Atomare replace-Funktion für Lieferschein-Positionen.
-- Verhindert Daten-Verlust bei updateLieferschein wenn DELETE durchläuft
-- aber INSERT scheitert (z.B. Validation-Fehler in einer Zeile).
-- SECURITY DEFINER nicht nötig — die normale RLS auf lieferschein_positionen
-- regelt Zugriff bereits korrekt (Mitarbeiter dürfen eigene Entwürfe ändern).

CREATE OR REPLACE FUNCTION public.replace_lieferschein_positionen(
  _lieferschein_id UUID,
  _positionen JSONB
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pos JSONB;
  idx INTEGER := 0;
BEGIN
  -- Authorize: nur Owner (Entwurf) oder Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = _lieferschein_id
       AND ((l.user_id = auth.uid() AND l.status = 'entwurf') OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Alles in EINER Transaktion (Function-Body ist atomar)
  DELETE FROM public.lieferschein_positionen WHERE lieferschein_id = _lieferschein_id;

  FOR pos IN SELECT * FROM jsonb_array_elements(_positionen)
  LOOP
    idx := idx + 1;
    INSERT INTO public.lieferschein_positionen
      (lieferschein_id, pos_nr, menge, einheit, bezeichnung, rabatt_eur)
    VALUES (
      _lieferschein_id,
      idx,
      (pos->>'menge')::NUMERIC,
      pos->>'einheit',
      pos->>'bezeichnung',
      CASE WHEN pos->>'rabatt_eur' IS NULL OR pos->>'rabatt_eur' = ''
           THEN NULL
           ELSE (pos->>'rabatt_eur')::NUMERIC
      END
    );
  END LOOP;
END $$;
