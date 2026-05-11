import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  id: number;
  buero_email: string | null;
  auto_send_to_buero: boolean;
  sender_email: string | null;
  sender_name: string | null;
  created_at: string;
  updated_at: string;
}

export type AppSettingsUpdate = Partial<
  Pick<AppSettings, "buero_email" | "auto_send_to_buero" | "sender_email" | "sender_name">
>;

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AppSettings | null;
}

export async function updateAppSettings(patch: AppSettingsUpdate): Promise<AppSettings> {
  // Inputs trimmen / leere Strings -> null für E-Mail-Felder
  const clean = (v: string | null | undefined): string | null => {
    if (v === null || v === undefined) return null;
    const t = String(v).trim();
    return t === "" ? null : t;
  };
  const body: AppSettingsUpdate = {};
  if ("buero_email" in patch) body.buero_email = clean(patch.buero_email);
  if ("sender_email" in patch) body.sender_email = clean(patch.sender_email);
  if ("sender_name" in patch) body.sender_name = clean(patch.sender_name);
  if ("auto_send_to_buero" in patch) body.auto_send_to_buero = !!patch.auto_send_to_buero;

  const { data, error } = await supabase
    .from("app_settings")
    .update(body)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data as AppSettings;
}
