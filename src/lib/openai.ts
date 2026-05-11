import { supabase } from "@/integrations/supabase/client";

export interface ParsedCustomer {
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  kunden_nummer: string;
  uid_nummer: string;
  email: string;
  telefon: string;
}

async function invokeFunction(body: any) {
  const { data, error } = await supabase.functions.invoke("openai-proxy", { body });
  if (error) throw new Error(error.message || "OpenAI request failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function improveBezeichnung(text: string): Promise<string> {
  const t = (text ?? "").trim();
  if (!t) return "";
  const data = await invokeFunction({ action: "improve-bezeichnung", text: t });
  return data?.improved ?? "";
}

export async function parseCustomersText(content: string): Promise<ParsedCustomer[]> {
  const data = await invokeFunction({ action: "parse-customers", kind: "text", content });
  return data?.customers ?? [];
}

export async function parseCustomersImage(base64DataUrl: string): Promise<ParsedCustomer[]> {
  const data = await invokeFunction({
    action: "parse-customers",
    kind: "image_base64",
    content: base64DataUrl,
  });
  return data?.customers ?? [];
}

export interface TranscribeResult {
  text: string;
  hallucination?: boolean;
}

/**
 * Audio-Upload: kommt nicht über supabase.functions.invoke (kein FormData-Support),
 * deshalb direkt mit fetch + JWT.
 * Wirft TranscribeEmptyError wenn nur Stille / Halluzination erkannt wurde.
 */
export class TranscribeEmptyError extends Error {
  constructor(public reason: "hallucination" | "empty") {
    super(reason === "hallucination" ? "Nichts Verständliches erkannt" : "Keine Sprache erkannt");
  }
}

export async function transcribeAudio(blob: Blob): Promise<TranscribeResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Nicht angemeldet");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;
  const fd = new FormData();
  fd.append("action", "transcribe");
  fd.append("audio", blob, "audio.webm");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Transkription fehlgeschlagen: ${res.status} ${t}`);
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  const text = (data?.text ?? "").trim();
  if (data?.hallucination) {
    throw new TranscribeEmptyError("hallucination");
  }
  if (text === "") {
    throw new TranscribeEmptyError("empty");
  }
  return { text, hallucination: !!data?.hallucination };
}
