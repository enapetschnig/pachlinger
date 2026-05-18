-- SMS-Einladung für Mitarbeiter

CREATE TABLE public.phone_invites (
  phone        TEXT PRIMARY KEY,                                   -- E.164: '+436641234567'
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at      TIMESTAMPTZ,
  vorname      TEXT,
  nachname     TEXT
);
ALTER TABLE public.phone_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY phone_invites_admin_read ON public.phone_invites FOR SELECT
  USING (public.is_admin());
CREATE POLICY phone_invites_admin_write ON public.phone_invites FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- handle_new_user erweitern: Phone-User werden nur aktiv wenn auf Invite-Whitelist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  first_user           BOOLEAN;
  is_designated_admin  BOOLEAN;
  should_be_admin      BOOLEAN;
  has_phone            BOOLEAN;
  phone_e164           TEXT;
  invite_row           public.phone_invites%ROWTYPE;
  invite_was_valid     BOOLEAN := FALSE;
BEGIN
  SELECT (SELECT COUNT(*) FROM auth.users WHERE id <> NEW.id) = 0 INTO first_user;
  is_designated_admin := lower(COALESCE(NEW.email,'')) = 'napetschnig.chris@gmail.com';
  should_be_admin := first_user OR is_designated_admin;
  has_phone := NEW.phone IS NOT NULL AND NEW.phone != '';

  IF has_phone THEN
    -- Supabase speichert Phone im E.164-Format aber ohne führendes '+'.
    -- Phone-Invites verwenden mit '+'. Beide Schreibweisen prüfen.
    phone_e164 := '+' || NEW.phone;
    SELECT * INTO invite_row
      FROM public.phone_invites
     WHERE phone = phone_e164 OR phone = NEW.phone
     LIMIT 1;

    IF invite_row.phone IS NOT NULL AND invite_row.used_at IS NULL THEN
      invite_was_valid := TRUE;
      UPDATE public.phone_invites
         SET used_at = now()
       WHERE phone = invite_row.phone;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'vorname', ''), invite_row.vorname, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nachname', ''), invite_row.nachname, ''),
    should_be_admin OR invite_was_valid
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN should_be_admin
                       THEN 'administrator'::app_role
                       ELSE 'mitarbeiter'::app_role END);
  RETURN NEW;
END $$;
