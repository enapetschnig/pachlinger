-- Token-basierte Einladungslinks: stabilere URLs + Name-Autofill

ALTER TABLE public.phone_invites
  ADD COLUMN IF NOT EXISTS token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS phone_invites_token_idx ON public.phone_invites (token);

-- RPC: anon-zugänglich, gibt Phone + Name zu einem Token zurück.
-- Wird vom Onboard-Form aufgerufen BEVOR der User authentifiziert ist.
-- Sicherheit: Token ist UUID, nicht erratbar. used_at-Check verhindert,
-- dass bereits-genutzte Tokens erneut Daten preisgeben.

CREATE OR REPLACE FUNCTION public.resolve_phone_invite(_token UUID)
RETURNS TABLE(phone TEXT, vorname TEXT, nachname TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.phone, i.vorname, i.nachname
    FROM public.phone_invites i
   WHERE i.token = _token
     AND i.used_at IS NULL
$$;

-- Anonymous Zugriff auf die Funktion erlauben (Onboarding-Page hat noch keinen JWT)
GRANT EXECUTE ON FUNCTION public.resolve_phone_invite(UUID) TO anon, authenticated;
