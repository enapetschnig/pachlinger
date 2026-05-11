import { supabase } from "@/integrations/supabase/client";

export interface Kunde {
  id: string;
  created_by: string | null;
  name: string;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  kunden_nummer: string | null;
  uid_nummer: string | null;
  email: string | null;
  telefon: string | null;
  notizen: string | null;
  created_at: string;
  updated_at: string;
}

export type KundeInput = {
  name: string;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  kunden_nummer?: string | null;
  uid_nummer?: string | null;
  email?: string | null;
  telefon?: string | null;
  notizen?: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function normalizeInput(input: KundeInput) {
  return {
    name: input.name.trim(),
    strasse: clean(input.strasse),
    plz: clean(input.plz),
    ort: clean(input.ort),
    kunden_nummer: clean(input.kunden_nummer),
    uid_nummer: clean(input.uid_nummer),
    email: clean(input.email),
    telefon: clean(input.telefon),
    notizen: clean(input.notizen),
  };
}

export async function listKunden(): Promise<Kunde[]> {
  const { data, error } = await supabase
    .from("kunden")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Kunde[];
}

export async function searchKunden(query: string, limit = 20): Promise<Kunde[]> {
  const q = query.trim();
  if (q === "") {
    const { data, error } = await supabase
      .from("kunden")
      .select("*")
      .order("name", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Kunde[];
  }
  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("kunden")
    .select("*")
    .or(`name.ilike.${pattern},kunden_nummer.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Kunde[];
}

export async function getKunde(id: string): Promise<Kunde | null> {
  const { data, error } = await supabase
    .from("kunden")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Kunde | null;
}

export async function createKunde(input: KundeInput): Promise<Kunde> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { data, error } = await supabase
    .from("kunden")
    .insert({ ...normalizeInput(input), created_by: user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as Kunde;
}

export async function bulkCreateKunden(inputs: KundeInput[]): Promise<Kunde[]> {
  if (inputs.length === 0) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const rows = inputs.map((i) => ({ ...normalizeInput(i), created_by: user.id }));
  const { data, error } = await supabase.from("kunden").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as Kunde[];
}

export async function updateKunde(id: string, input: KundeInput): Promise<Kunde> {
  const { data, error } = await supabase
    .from("kunden")
    .update(normalizeInput(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Kunde;
}

export async function deleteKunde(id: string): Promise<void> {
  const { error } = await supabase.from("kunden").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Stellt sicher dass für die Empfänger-Daten eines Lieferscheins ein Kunde existiert.
 * - Wenn `kunde_id` schon gesetzt: gibt diese zurück.
 * - Sonst sucht nach exaktem Name-Match (case-insensitive). Wenn gefunden: dessen ID.
 * - Sonst: neuen Kunden anlegen, ID zurückgeben.
 * Wirft wenn `name` leer ist und keine kunde_id übergeben wurde.
 */
export async function ensureKundeForLieferschein(opts: {
  kunde_id: string | null | undefined;
  name: string;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  kunden_nummer?: string | null;
  uid_nummer?: string | null;
}): Promise<{ kunde_id: string | null; created: boolean }> {
  if (opts.kunde_id) return { kunde_id: opts.kunde_id, created: false };

  const name = (opts.name ?? "").trim();
  if (name === "") return { kunde_id: null, created: false };

  // Exakter Name-Match (case-insensitive)?
  const { data: existing } = await supabase
    .from("kunden")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { kunde_id: existing.id, created: false };

  const k = await createKunde({
    name,
    strasse: opts.strasse,
    plz: opts.plz,
    ort: opts.ort,
    kunden_nummer: opts.kunden_nummer,
    uid_nummer: opts.uid_nummer,
  });
  return { kunde_id: k.id, created: true };
}
