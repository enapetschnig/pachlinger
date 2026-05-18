// Supabase Edge Function: send-invite-sms
// Admin lädt einen oder mehrere Mitarbeiter per SMS ein.
// Pro Phone:
//   1. UPSERT in phone_invites (used_at=NULL — Whitelist für handle_new_user)
//   2. Twilio API call: SMS mit Onboarding-Link an die Nummer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_PHONE = Deno.env.get("TWILIO_FROM_PHONE");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });

// Normalisiert Eingabe auf E.164: +43...
// Akzeptiert: "+43664...", "0664...", "+43 664 1234567" mit Leerzeichen/Bindestrichen.
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("0")) s = "+43" + s.slice(1);
  if (!s.startsWith("+")) return null;
  if (!/^\+\d{8,15}$/.test(s)) return null;
  return s;
}

interface InviteInput {
  phone: string;
  vorname?: string;
  nachname?: string;
}

interface InviteResult {
  phone: string;
  ok: boolean;
  error?: string;
}

async function sendOneInvite(
  invite: InviteInput,
  admin: ReturnType<typeof createClient>,
  appUrl: string,
  creatorId: string,
): Promise<InviteResult> {
  const phone = normalizePhone(invite.phone);
  if (!phone) {
    return { phone: invite.phone, ok: false, error: "Ungültiges Telefonformat" };
  }

  // UPSERT phone_invite (existiert vielleicht schon — wir setzen used_at zurück
  // damit der User sich neu registrieren kann)
  const { error: upsertErr } = await admin.from("phone_invites").upsert(
    {
      phone,
      created_by: creatorId,
      vorname: invite.vorname ?? null,
      nachname: invite.nachname ?? null,
      used_at: null,
    },
    { onConflict: "phone" },
  );
  if (upsertErr) {
    return { phone, ok: false, error: `DB: ${upsertErr.message}` };
  }

  // Twilio SMS
  const greet = invite.vorname?.trim() ? ` ${invite.vorname.trim()}` : "";
  const body =
    `Hallo${greet}! Du wurdest zur Pachlinger-Lieferschein-App eingeladen. ` +
    `Bitte registriere dich hier: ${appUrl}/onboard?p=${encodeURIComponent(phone)}`;

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const form = new URLSearchParams();
  form.set("From", TWILIO_FROM_PHONE!);
  form.set("To", phone);
  form.set("Body", body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    let twilioMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      twilioMsg = parsed.message ?? errText;
    } catch {
      // ignore
    }
    return { phone, ok: false, error: `Twilio ${res.status}: ${twilioMsg}` };
  }

  return { phone, ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
    return json({ error: "Twilio nicht konfiguriert" }, 500);
  }

  // Auth-Check
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  // Admin-Check via Service-Role
  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "administrator") {
    return json({ error: "forbidden (admin only)" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const invites: InviteInput[] = Array.isArray(body?.invites) ? body.invites : [];
  if (invites.length === 0) {
    return json({ error: "Keine Einladungen übergeben" }, 400);
  }
  if (invites.length > 50) {
    return json({ error: "Maximal 50 Einladungen pro Aufruf" }, 413);
  }

  const appUrl = (body?.appUrl ?? "").toString().replace(/\/+$/, "");
  if (!appUrl || !/^https?:\/\//.test(appUrl)) {
    return json({ error: "appUrl fehlt oder ungültig" }, 400);
  }

  const results: InviteResult[] = [];
  for (const inv of invites) {
    try {
      const r = await sendOneInvite(inv, admin, appUrl, user.id);
      results.push(r);
    } catch (e) {
      results.push({
        phone: inv.phone,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return json({ results });
});
