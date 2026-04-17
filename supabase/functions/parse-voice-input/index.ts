const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParsedResult {
  beschreibung: string;
  materials: Array<{ material: string; menge: string }>;
  kundeName?: string;
  kundeAdresse?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Kein Transkript erhalten" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OpenAI API Key nicht konfiguriert" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const systemPrompt = `Du bist ein Assistent für FASCHING Gebäudetechnik (Heizung, Kälte, Lüftung, Sanitär, Service).
Du erhältst eine Sprachaufnahme eines Technikers, der seine durchgeführten Arbeiten beschreibt.

Deine Aufgabe: Fasse das zusammen in eine saubere, formlose Auflistung der Tätigkeiten.

Regeln:
- FORMLOS und KURZ. Keine ganzen Sätze, keine dritte Person.
- Jede Tätigkeit auf einer eigenen Zeile (Zeilenumbruch zwischen den Punkten).
- Tippfehler, Spracherkennungsfehler und Groß-/Kleinschreibung still korrigieren.
  Fachbegriffe sauber schreiben (z.B. "Fußbodenheizung", "Heizkörper", "Sanitär").
- Nichts hinzuerfinden, nichts weglassen. Nur sauber zusammenfassen.

Beispiel-Input: "hab heute fünf heizkörper montiert und die fusbohdenheizung im erdgeschoss angeschlossen dann noch dichtheitsprüfung gemacht"
Beispiel-Output:
Montage von 5 Heizkörpern
Anschluss Fußbodenheizung EG
Dichtheitsprüfung durchgeführt

Antworte NUR mit dem zusammengefassten Text, kein JSON, kein Markdown, kein Drumherum.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      const errorMsg = response.status === 429
        ? "KI-Dienst vorübergehend überlastet. Bitte in 30 Sekunden erneut versuchen."
        : response.status === 401
        ? "OpenAI API-Key ungültig. Bitte im Supabase Dashboard prüfen."
        : `OpenAI API Fehler: ${response.status}`;
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();

    // Fallback: Rohtranskript, falls KI leer geantwortet hat
    const beschreibung = content || transcript;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          beschreibung,
          materials: [],
          kundeName: null,
          kundeAdresse: null,
        },
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("parse-voice-input error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error)?.message || "Unbekannter Fehler" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
