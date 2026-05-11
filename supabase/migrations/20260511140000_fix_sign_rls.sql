-- Fix: Mitarbeiter darf seinen eigenen Entwurf updaten — auch wenn der Update
-- den Status auf 'unterschrieben' setzt. Bisher hat WITH CHECK implizit den
-- USING-Ausdruck übernommen und damit jeden Status-Übergang verboten.

DROP POLICY IF EXISTS ls_update_own_draft ON public.lieferscheine;

CREATE POLICY ls_update_own_draft ON public.lieferscheine
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'entwurf')
  WITH CHECK (auth.uid() = user_id);

-- Positionen-Policy hat keinen Status-Toggle-Use-Case, bleibt unverändert.
