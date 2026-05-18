import { supabase } from "@/integrations/supabase/client";

export interface ActiveMitarbeiter {
  id: string;
  vorname: string;
  nachname: string;
}

/**
 * Liste aller aktiven User (für Zuweisen-Dropdown).
 * Profile sind nur sichtbar für Admin (RLS), daher reicht ein SELECT.
 */
export async function listActiveMitarbeiter(): Promise<ActiveMitarbeiter[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, vorname, nachname")
    .eq("is_active", true)
    .order("vorname", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActiveMitarbeiter[];
}

/**
 * Anzahl der Entwurf-Lieferscheine die einem User zugewiesen sind.
 * Für den Dashboard-Banner.
 */
export async function countAssignedDrafts(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("lieferscheine")
    .select("id", { count: "exact", head: true })
    .contains("assigned_to", [userId])
    .eq("status", "entwurf");
  if (error) throw error;
  return count ?? 0;
}
