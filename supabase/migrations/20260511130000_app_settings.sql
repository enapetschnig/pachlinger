-- Globale App-Einstellungen (Singleton)
CREATE TABLE public.app_settings (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  buero_email        TEXT,
  auto_send_to_buero BOOLEAN NOT NULL DEFAULT TRUE,
  sender_email       TEXT,    -- z.B. "lieferschein@deine-domain.at"; null → Resend-Default
  sender_name        TEXT,    -- z.B. "Pachlinger GmbH"
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Singleton-Row anlegen
INSERT INTO public.app_settings (id, sender_name) VALUES (1, 'Pachlinger GmbH')
  ON CONFLICT (id) DO NOTHING;

-- RLS: alle aktiven User dürfen die Settings LESEN (zumindest buero_email +
--      auto_send_to_buero werden im Frontend gebraucht). Nur Admin schreibt.
CREATE POLICY app_settings_read_active ON public.app_settings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid() AND p.is_active)
  );

CREATE POLICY app_settings_admin_write ON public.app_settings FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
