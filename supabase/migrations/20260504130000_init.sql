-- ============================================================================
-- 0001_init.sql  —  Pachlinger GmbH Lieferschein-App, Bootstrap-Schema
-- ============================================================================

-- ---------- Roles & Profile ----------
CREATE TYPE public.app_role AS ENUM ('administrator', 'mitarbeiter');

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vorname     TEXT NOT NULL,
  nachname    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'administrator'::app_role)
$$;

-- ---------- Lieferscheine ----------
CREATE TYPE public.lieferschein_status AS ENUM ('entwurf', 'versendet', 'unterschrieben');

CREATE TABLE public.lieferscheine (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  jahr               INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  lfd_nr             INTEGER NOT NULL DEFAULT 0,
  nummer             TEXT GENERATED ALWAYS AS
                       ('LS' || lpad(lfd_nr::TEXT, 4, '0') || '/' || jahr::TEXT) STORED,

  lieferschein_datum DATE NOT NULL DEFAULT CURRENT_DATE,
  kunden_nummer      TEXT,
  leistung           TEXT,
  empfaenger_uid     TEXT,

  empfaenger_name    TEXT NOT NULL,
  empfaenger_strasse TEXT,
  empfaenger_plz     TEXT,
  empfaenger_ort     TEXT,

  betreff            TEXT,
  angebot_nr         TEXT,
  angebot_datum      DATE,
  bauseits           TEXT[] NOT NULL DEFAULT '{}',

  unterschrift_ort        TEXT,
  unterschrift_datum      DATE,
  unterschrift_image_url  TEXT,

  status             lieferschein_status NOT NULL DEFAULT 'entwurf',

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (jahr, lfd_nr)
);
ALTER TABLE public.lieferscheine ENABLE ROW LEVEL SECURITY;
CREATE INDEX lieferscheine_user_idx       ON public.lieferscheine (user_id);
CREATE INDEX lieferscheine_datum_idx      ON public.lieferscheine (lieferschein_datum DESC);
CREATE INDEX lieferscheine_status_idx     ON public.lieferscheine (status);

CREATE TABLE public.lieferschein_positionen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lieferschein_id UUID NOT NULL REFERENCES public.lieferscheine(id) ON DELETE CASCADE,
  pos_nr          INTEGER NOT NULL,
  menge           NUMERIC(12,3) NOT NULL DEFAULT 1,
  einheit         TEXT NOT NULL DEFAULT 'Stk.',
  bezeichnung     TEXT NOT NULL,
  rabatt_eur      NUMERIC(12,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lieferschein_id, pos_nr)
);
ALTER TABLE public.lieferschein_positionen ENABLE ROW LEVEL SECURITY;
CREATE INDEX lieferschein_positionen_ls_idx ON public.lieferschein_positionen (lieferschein_id);

-- ---------- Triggers ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_touch       BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER lieferscheine_touch  BEFORE UPDATE ON public.lieferscheine
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.assign_lieferschein_nummer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_nr INT;
BEGIN
  IF NEW.lfd_nr IS NOT NULL AND NEW.lfd_nr > 0 THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('lieferschein_nr_' || NEW.jahr::TEXT));
  SELECT COALESCE(MAX(lfd_nr), 0) + 1
    INTO next_nr
    FROM public.lieferscheine
   WHERE jahr = NEW.jahr;
  NEW.lfd_nr := next_nr;
  RETURN NEW;
END $$;

CREATE TRIGGER lieferscheine_assign_nr
  BEFORE INSERT ON public.lieferscheine
  FOR EACH ROW EXECUTE FUNCTION public.assign_lieferschein_nummer();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user BOOLEAN;
BEGIN
  SELECT (SELECT COUNT(*) FROM auth.users WHERE id <> NEW.id) = 0 INTO first_user;

  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'vorname',''),
          COALESCE(NEW.raw_user_meta_data->>'nachname',''),
          first_user);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'administrator'::app_role
                                       ELSE 'mitarbeiter'::app_role END);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); meta jsonb; first_user BOOLEAN;
BEGIN
  IF uid IS NULL THEN RETURN json_build_object('success',false,'error','not_authed'); END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid)
     THEN RETURN json_build_object('success',true,'action','existing'); END IF;

  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = uid;
  SELECT (SELECT COUNT(*) FROM public.profiles) = 0 INTO first_user;

  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (uid, COALESCE(meta->>'vorname',''), COALESCE(meta->>'nachname',''), first_user);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, CASE WHEN first_user THEN 'administrator'::app_role ELSE 'mitarbeiter'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object('success', true, 'action','created');
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_user_email(_uid UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (SELECT email FROM auth.users WHERE id = _uid);
END $$;

-- ---------- RLS Policies ----------
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE USING (public.is_admin());
CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE USING (public.is_admin());

CREATE POLICY user_roles_select_self ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_roles_admin_all   ON public.user_roles
  FOR ALL    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY ls_select_own_or_admin ON public.lieferscheine
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY ls_insert_own ON public.lieferscheine
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.is_active)
  );

CREATE POLICY ls_update_own_draft ON public.lieferscheine
  FOR UPDATE USING (auth.uid() = user_id AND status = 'entwurf');
CREATE POLICY ls_update_admin ON public.lieferscheine
  FOR UPDATE USING (public.is_admin());

CREATE POLICY ls_delete_own_draft ON public.lieferscheine
  FOR DELETE USING (auth.uid() = user_id AND status = 'entwurf');
CREATE POLICY ls_delete_admin ON public.lieferscheine
  FOR DELETE USING (public.is_admin());

CREATE POLICY pos_select ON public.lieferschein_positionen
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND (l.user_id = auth.uid() OR public.is_admin())
  ));

CREATE POLICY pos_insert ON public.lieferschein_positionen
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND ((l.user_id = auth.uid() AND l.status = 'entwurf') OR public.is_admin())
  ));

CREATE POLICY pos_update ON public.lieferschein_positionen
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND ((l.user_id = auth.uid() AND l.status = 'entwurf') OR public.is_admin())
  ));

CREATE POLICY pos_delete ON public.lieferschein_positionen
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.lieferscheine l
     WHERE l.id = lieferschein_id
       AND ((l.user_id = auth.uid() AND l.status = 'entwurf') OR public.is_admin())
  ));

-- ---------- Storage Bucket ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('lieferschein-signatures', 'lieferschein-signatures', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY sig_owner_read   ON storage.objects FOR SELECT
  USING (bucket_id = 'lieferschein-signatures'
         AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));
CREATE POLICY sig_owner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lieferschein-signatures'
              AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY sig_owner_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'lieferschein-signatures'
         AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));
CREATE POLICY sig_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'lieferschein-signatures'
         AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));
-- Patch: admin_delete_user RPC + lieferscheine FK SET NULL

ALTER TABLE public.lieferscheine ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.lieferscheine DROP CONSTRAINT lieferscheine_user_id_fkey;
ALTER TABLE public.lieferscheine
  ADD CONSTRAINT lieferscheine_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_delete_user(_uid UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _uid = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete self';
  END IF;
  DELETE FROM auth.users WHERE id = _uid;
END $$;
-- napetschnig.chris@gmail.com soll immer Admin werden, egal in welcher Reihenfolge

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  first_user BOOLEAN;
  is_designated_admin BOOLEAN;
  should_be_admin BOOLEAN;
BEGIN
  SELECT (SELECT COUNT(*) FROM auth.users WHERE id <> NEW.id) = 0 INTO first_user;
  is_designated_admin := lower(COALESCE(NEW.email, '')) = 'napetschnig.chris@gmail.com';
  should_be_admin := first_user OR is_designated_admin;

  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'vorname',''),
          COALESCE(NEW.raw_user_meta_data->>'nachname',''),
          should_be_admin);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN should_be_admin THEN 'administrator'::app_role
                                            ELSE 'mitarbeiter'::app_role END);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  meta jsonb;
  email TEXT;
  first_user BOOLEAN;
  is_designated_admin BOOLEAN;
  should_be_admin BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authed');
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RETURN json_build_object('success', true, 'action', 'existing');
  END IF;

  SELECT raw_user_meta_data, email INTO meta, email FROM auth.users WHERE id = uid;
  SELECT (SELECT COUNT(*) FROM public.profiles) = 0 INTO first_user;
  is_designated_admin := lower(COALESCE(email, '')) = 'napetschnig.chris@gmail.com';
  should_be_admin := first_user OR is_designated_admin;

  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (uid, COALESCE(meta->>'vorname',''), COALESCE(meta->>'nachname',''), should_be_admin);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, CASE WHEN should_be_admin THEN 'administrator'::app_role
                                         ELSE 'mitarbeiter'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object('success', true, 'action','created');
END $$;

-- Falls der User schon registriert ist: jetzt direkt zu Admin promovieren.
DO $$
DECLARE existing_uid UUID;
BEGIN
  SELECT id INTO existing_uid FROM auth.users
   WHERE lower(email) = 'napetschnig.chris@gmail.com';
  IF existing_uid IS NOT NULL THEN
    UPDATE public.profiles SET is_active = true WHERE id = existing_uid;
    DELETE FROM public.user_roles WHERE user_id = existing_uid;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_uid, 'administrator'::app_role);
  END IF;
END $$;
