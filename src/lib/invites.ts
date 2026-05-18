import { supabase } from "@/integrations/supabase/client";
import type { ParsedInvite } from "./phone";

export interface InviteResult {
  phone: string;
  ok: boolean;
  error?: string;
}

/**
 * Schickt eine Liste von Einladungen an die send-invite-sms Edge Function.
 * `appUrl` wird mitgesendet, damit der Invite-Link auf die aktuelle Domain zeigt
 * (lokal: http://localhost:8080, Vercel: https://...).
 */
export async function sendInvites(invites: ParsedInvite[]): Promise<InviteResult[]> {
  const appUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke("send-invite-sms", {
    body: { invites, appUrl },
  });
  if (error) throw new Error(error.message || "Einladung fehlgeschlagen");
  if (data?.error) throw new Error(data.error);
  return (data?.results ?? []) as InviteResult[];
}
