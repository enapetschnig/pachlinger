-- Kundenverwaltung
CREATE TABLE public.kunden (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  strasse         TEXT,
  plz             TEXT,
  ort             TEXT,
  kunden_nummer   TEXT,
  uid_nummer      TEXT,
  email           TEXT,
  telefon         TEXT,
  notizen         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER kunden_touch BEFORE UPDATE ON public.kunden
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX kunden_name_idx          ON public.kunden (lower(name));
CREATE INDEX kunden_kunden_nummer_idx ON public.kunden (kunden_nummer);

-- RLS
--  · alle aktiven User dürfen lesen
--  · alle aktiven User dürfen einfügen (transparentes Auto-Anlegen)
--  · nur Admin darf updaten / löschen
CREATE POLICY kunden_read_active ON public.kunden FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid() AND p.is_active)
  );

CREATE POLICY kunden_insert_active ON public.kunden FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid() AND p.is_active)
    AND created_by = auth.uid()
  );

CREATE POLICY kunden_admin_update ON public.kunden FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY kunden_admin_delete ON public.kunden FOR DELETE
  USING (public.is_admin());

-- Lieferschein → Kunde Verknüpfung (optional)
ALTER TABLE public.lieferscheine
  ADD COLUMN kunde_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL;

CREATE INDEX lieferscheine_kunde_id_idx ON public.lieferscheine (kunde_id);
