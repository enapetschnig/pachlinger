import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WAPI_TOKEN = Deno.env.get("WAPI_TOKEN")!;
const WAPI_BASE = "https://gate.whapi.cloud";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendWhatsApp(to: string, message: string) {
  const recipient = to.includes("@") ? to : `${to}@s.whatsapp.net`;
  const res = await fetch(`${WAPI_BASE}/messages/text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: recipient, body: message }),
  });
  return res.json();
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("0")) cleaned = `43${cleaned.slice(1)}`;
  return cleaned;
}

function buildOnboardingMessage(vorname: string): string {
  return `Hallo ${vorname}! 👋

Willkommen beim *eBauer GmbH WhatsApp-Assistenten*! 🎉

Ich bin dein digitaler Helfer und mache dir das Arbeiten einfacher. Hier ist, was ich alles kann:

━━━━━━━━━━━━━━━━━━━

📝 *Stunden buchen*
Schreib mir einfach was du gemacht hast, z.B.:
• _"8h Musterstraße Kabel verlegt"_
• _"Heute 6,5 Stunden auf der Baustelle Sonnenhof"_
• _"Von 7 bis 15:30 war ich in der Werkstatt"_

Wenn du nicht weißt auf welches Projekt: Schreib einfach _"Stunden schreiben"_ und ich zeig dir die Projektliste!

━━━━━━━━━━━━━━━━━━━

📸 *Fotos hochladen*
Schick mir ein Foto mit dem Projektnamen als Beschreibung – fertig! Das Foto wird automatisch dem Projekt zugeordnet.

━━━━━━━━━━━━━━━━━━━

📋 *Einteilung abfragen*
Frag mich einfach:
• _"Wo muss ich heute hin?"_
• _"Was steht heute an?"_

━━━━━━━━━━━━━━━━━━━

❌ *Korrektur*
Falls mal was falsch war:
• _"Die letzte Buchung war falsch"_
• _"Lösch die letzte Buchung"_

━━━━━━━━━━━━━━━━━━━

Du kannst ganz normal mit mir schreiben – ich verstehe dich! 💬

Probier's gleich aus: Schreib mir z.B. _"Projekte"_ um alle aktiven Projekte zu sehen.`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (role?.role !== "administrator") {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { employee_id } = await req.json();
    if (!employee_id) {
      return new Response(
        JSON.stringify({ error: "employee_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get employee data
    const { data: emp } = await supabase
      .from("employees")
      .select("id, vorname, nachname, telefon, user_id, whatsapp_aktiv")
      .eq("id", employee_id)
      .maybeSingle();

    if (!emp) {
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!emp.telefon) {
      return new Response(
        JSON.stringify({ error: "Keine Telefonnummer hinterlegt" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const waPhone = formatPhone(emp.telefon);
    const message = buildOnboardingMessage(emp.vorname);

    // Send onboarding message
    const result = await sendWhatsApp(waPhone, message);

    // Log the message
    await supabase.from("whatsapp_messages").insert({
      phone: waPhone,
      direction: "outgoing",
      message_body: message,
      employee_id: emp.id,
      user_id: emp.user_id,
      processed: true,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        sent_to: `${emp.vorname} ${emp.nachname}`,
        phone: waPhone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Onboarding error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
