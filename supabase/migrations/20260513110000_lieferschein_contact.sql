-- Empfänger-Kontaktdaten als Snapshot im Lieferschein
ALTER TABLE public.lieferscheine
  ADD COLUMN empfaenger_email   TEXT,
  ADD COLUMN empfaenger_telefon TEXT;
