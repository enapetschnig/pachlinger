// Supabase Edge Function: openai-proxy
// Aktionen:
//   - improve-bezeichnung: GPT bereinigt Position-Bezeichnungen (Rechtschreibung, technische Termini)
//   - parse-customers: Freitext oder Bild -> strukturierte Kundenliste (JSON)
//   - transcribe: Audio -> Text via Whisper
//
// Auth: alle Aufrufe benötigen gültigen Supabase-User-JWT.
// parse-customers + transcribe sind für jeden eingeloggten User offen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

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

async function improveBezeichnung(text: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Du bist Assistent für Pachlinger GmbH (Lüftung, Klima, Brandschutzklappen, Arbeitsbühnen). " +
            "Bekommst eine Position-Bezeichnung eines Lieferscheins, oft aus Spracheingabe oder schnellem Tippen. " +
            "Gib NUR die korrigierte Bezeichnung zurück (keine Erklärungen, kein Markdown, keine Anführungszeichen). " +
            "Behalte Kurzform und Fachbegriffe bei. Beispiele: 'BSK DN 250 manuell', 'Regiearbeiten Arbeitszeit Partie', 'Gitter 250 / 250', 'An- / Abfahrt'. " +
            "Korrigiere Rechtschreibung, normalisiere Einheiten, behalte Zahlen und Abkürzungen exakt bei. " +
            "Schreibe Substantive groß. Falls Eingabe leer oder Unsinn ist, gib leeren String zurück.",
        },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI improve failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const improved = (data.choices?.[0]?.message?.content ?? "").trim();
  return improved;
}

const CUSTOMERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["customers"],
  properties: {
    customers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "strasse", "plz", "ort", "kunden_nummer", "uid_nummer", "email", "telefon"],
        properties: {
          name: { type: "string" },
          strasse: { type: "string" },
          plz: { type: "string" },
          ort: { type: "string" },
          kunden_nummer: { type: "string" },
          uid_nummer: { type: "string" },
          email: { type: "string" },
          telefon: { type: "string" },
        },
      },
    },
  },
};

const PARSE_SYSTEM_PROMPT =
  "Extrahiere alle Kundendaten aus der Eingabe als strukturierte Liste. " +
  "Jeder Kunde hat: name (Firma/Person), strasse, plz (z.B. '8753'), ort, kunden_nummer (falls vorhanden), uid_nummer (z.B. 'ATU37258604'), email, telefon. " +
  "Wenn ein Feld nicht in der Quelle steht: leerer String. Erfinde keine Daten. " +
  "Wenn keine Kunden erkennbar sind, gib leere Liste zurück.";

async function parseCustomersText(content: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        { role: "user", content },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "kunden_liste",
          strict: true,
          schema: CUSTOMERS_SCHEMA,
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI parse failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const out = JSON.parse(data.choices?.[0]?.message?.content ?? '{"customers":[]}');
  return out;
}

async function parseCustomersImage(base64DataUrl: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrahiere die Kundendaten aus diesem Bild." },
            { type: "image_url", image_url: { url: base64DataUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "kunden_liste",
          strict: true,
          schema: CUSTOMERS_SCHEMA,
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI vision failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const out = JSON.parse(data.choices?.[0]?.message?.content ?? '{"customers":[]}');
  return out;
}

async function transcribe(audioBlob: Blob, language = "de") {
  const fd = new FormData();
  fd.append("file", audioBlob, "audio.webm");
  fd.append("model", "whisper-1");
  fd.append("language", language);
  fd.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI transcribe failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return { text: (data.text ?? "").trim() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not configured" }, 500);

  try {
    const user = await getUserFromRequest(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const contentType = req.headers.get("content-type") ?? "";

    // Audio Upload (transcribe)
    if (contentType.startsWith("multipart/form-data")) {
      const fd = await req.formData();
      const action = fd.get("action");
      if (action === "transcribe") {
        const file = fd.get("audio");
        if (!(file instanceof Blob)) return json({ error: "missing audio" }, 400);
        const out = await transcribe(file);
        return json(out);
      }
      return json({ error: "unknown multipart action" }, 400);
    }

    // JSON Actions
    const body = await req.json();
    const action = body.action;

    if (action === "improve-bezeichnung") {
      const text = (body.text ?? "").toString().slice(0, 4000);
      if (!text.trim()) return json({ improved: "" });
      const improved = await improveBezeichnung(text);
      return json({ improved });
    }

    if (action === "parse-customers") {
      const kind = body.kind;
      const content = (body.content ?? "").toString();
      if (kind === "image_base64") {
        const out = await parseCustomersImage(content);
        return json(out);
      }
      if (kind === "text") {
        if (!content.trim()) return json({ customers: [] });
        const out = await parseCustomersText(content.slice(0, 50000));
        return json(out);
      }
      return json({ error: "unknown kind" }, 400);
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
