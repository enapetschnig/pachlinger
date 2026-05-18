-- Mitarbeiter dürfen jetzt auch UPDATE (analog zu INSERT-Policy).
-- DELETE bleibt Admin-only (kunden_admin_delete).

DROP POLICY IF EXISTS kunden_admin_update ON public.kunden;

CREATE POLICY kunden_update_active ON public.kunden FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid() AND p.is_active)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid() AND p.is_active)
  );
