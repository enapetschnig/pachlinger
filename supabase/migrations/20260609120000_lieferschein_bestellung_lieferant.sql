-- Bestellung & Lieferant: Beschaffungs-Referenz auf dem Lieferschein.
-- Bestellnummer beim jeweiligen Lieferanten ("Bestellnummer vom Lieferant").
-- Beide optional, Freitext. Bestehende RLS-Policies decken die neuen Spalten ab.
ALTER TABLE public.lieferscheine
  ADD COLUMN bestellnummer TEXT,
  ADD COLUMN lieferant     TEXT;
