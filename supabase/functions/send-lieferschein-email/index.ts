// Supabase Edge Function: send-lieferschein-email
// Body: {
//   lieferschein_id: string,
//   nummer: string,
//   to_kunde: string[],           // E-Mails an Kunde (kann leer sein)
//   to_buero: string[],           // E-Mails ans Büro (kann leer sein)
//   reply_to?: string,
//   subject?: string,
//   body?: string,                // optionaler User-Text (mehrzeilig erlaubt)
//   pdf_base64: string,           // PDF-Inhalt (ohne data:-prefix)
//   pdf_filename: string,
// }
//
// Lädt sender_name/sender_email aus app_settings, fällt zurück auf Resend-Defaults.
// Schickt EINE E-Mail mit `to` = Kunde-Adressen + `bcc` = Büro-Adressen
// (Kunde sieht Büro nicht). Reply-To aus Settings (oder Param-Override).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const sb = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);

  try {
    const user = await getUserFromRequest(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const {
      lieferschein_id,
      nummer,
      to_kunde = [],
      to_buero = [],
      reply_to: replyToOverride,
      subject: subjectOverride,
      body: customBody,
      pdf_base64,
      pdf_filename,
    } = body ?? {};

    if (!pdf_base64 || !pdf_filename) {
      return json({ error: "pdf_base64 and pdf_filename required" }, 400);
    }
    if ((to_kunde.length ?? 0) === 0 && (to_buero.length ?? 0) === 0) {
      return json({ error: "Mindestens ein Empfänger erforderlich" }, 400);
    }

    // Absender fest verdrahtet — Domain handwerkapp.at ist bei Resend verifiziert.
    const SENDER_EMAIL = "pachlinger@handwerkapp.at";
    const SENDER_NAME = "Pachlinger GmbH";

    // Nur Büro-E-Mail aus app_settings (für Reply-To, falls kein Override).
    // service-role-Client umgeht RLS, damit auch Mitarbeiter senden können.
    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: settings } = await admin
      .from("app_settings")
      .select("buero_email")
      .eq("id", 1)
      .maybeSingle();

    const senderEmail = SENDER_EMAIL;
    const senderName = SENDER_NAME;
    const replyTo = replyToOverride?.trim() || settings?.buero_email?.trim() || undefined;

    const allRecipients = [...to_kunde, ...to_buero].filter((e: string) => e && e.trim() !== "");
    if (allRecipients.length === 0) {
      return json({ error: "Keine gültigen E-Mail-Adressen" }, 400);
    }

    const subject = subjectOverride?.trim() || `Lieferschein ${nummer ?? ""}`.trim();

    // Body aufbauen (HTML + Text)
    const intro = (customBody ?? "").trim();
    const greeting = "Sehr geehrte Damen und Herren,";
    const closing = `mit freundlichen Grüßen\n${senderName}`;
    const defaultMsg = `anbei finden Sie unseren Lieferschein${nummer ? ` ${nummer}` : ""} als PDF.`;
    const textBody = `${greeting}\n\n${intro ? intro + "\n\n" : ""}${defaultMsg}\n\n${closing}`;
    const htmlBody = `<p>${greeting}</p>${
      intro ? `<p>${intro.replace(/\n/g, "<br>")}</p>` : ""
    }<p>${defaultMsg}</p><p>${closing.replace(/\n/g, "<br>")}</p>`;

    const payload: any = {
      from: `${senderName} <${senderEmail}>`,
      to: to_kunde.length > 0 ? to_kunde : to_buero,
      // BCC nur wenn beide Listen Inhalt haben (sonst sind alle bereits in `to`)
      bcc: to_kunde.length > 0 && to_buero.length > 0 ? to_buero : undefined,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: pdf_filename,
          content: pdf_base64,
        },
      ],
    };
    if (replyTo) payload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json(
        { error: data?.message ?? data?.name ?? `Resend ${res.status}` },
        res.status,
      );
    }

    return json({
      success: true,
      id: data.id,
      to: to_kunde,
      bcc: to_buero,
      reply_to: replyTo,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
