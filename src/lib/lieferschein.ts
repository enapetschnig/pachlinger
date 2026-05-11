import React from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { LieferscheinPdf } from "@/components/lieferschein/LieferscheinPdf";
export { formatDateDe, statusLabel } from "./lieferschein-format";

export type LieferscheinStatus = "entwurf" | "versendet" | "unterschrieben";

export interface Position {
  id?: string;
  pos_nr: number;
  menge: number;
  einheit: string;
  bezeichnung: string;
  rabatt_eur: number | null;
}

export interface Lieferschein {
  id: string;
  user_id: string | null;
  kunde_id: string | null;
  jahr: number;
  lfd_nr: number;
  nummer: string;
  lieferschein_datum: string;
  kunden_nummer: string | null;
  leistung: string | null;
  empfaenger_uid: string | null;
  empfaenger_name: string;
  empfaenger_strasse: string | null;
  empfaenger_plz: string | null;
  empfaenger_ort: string | null;
  betreff: string | null;
  angebot_nr: string | null;
  angebot_datum: string | null;
  bauseits: string[];
  unterschrift_ort: string | null;
  unterschrift_datum: string | null;
  unterschrift_image_url: string | null;
  status: LieferscheinStatus;
  created_at: string;
  updated_at: string;
}

export interface LieferscheinWithPositions extends Lieferschein {
  positionen: Position[];
}

export interface LieferscheinFormData {
  kunde_id: string | null;
  lieferschein_datum: string;
  kunden_nummer: string;
  leistung: string;
  empfaenger_uid: string;
  empfaenger_name: string;
  empfaenger_strasse: string;
  empfaenger_plz: string;
  empfaenger_ort: string;
  betreff: string;
  angebot_nr: string;
  angebot_datum: string;
  bauseits: { value: string }[];
  positionen: {
    menge: number;
    einheit: string;
    bezeichnung: string;
    rabatt_eur: number | null;
  }[];
}

export const EINHEITEN = ["Stk.", "Std.", "PA", "m", "m²", "kg", "l", "h", "Pkt."];

export const COMMON_BAUSEITS = [
  "Elektriker",
  "Rigipsarbeiten",
  "Schotte",
  "Stahl UK",
  "Maler",
  "Bodenleger",
  "Fliesenleger",
  "Putzarbeiten",
];

export async function listLieferscheine(): Promise<Lieferschein[]> {
  const { data, error } = await supabase
    .from("lieferscheine")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lieferschein[];
}

export async function getLieferschein(id: string): Promise<LieferscheinWithPositions | null> {
  const { data: ls, error } = await supabase
    .from("lieferscheine")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!ls) return null;

  const { data: positionen, error: posErr } = await supabase
    .from("lieferschein_positionen")
    .select("*")
    .eq("lieferschein_id", id)
    .order("pos_nr");
  if (posErr) throw posErr;

  return { ...(ls as Lieferschein), positionen: (positionen ?? []) as Position[] };
}

export async function createLieferschein(form: LieferscheinFormData): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { data: ls, error } = await supabase
    .from("lieferscheine")
    .insert({
      user_id: user.id,
      kunde_id: form.kunde_id ?? null,
      lieferschein_datum: form.lieferschein_datum,
      kunden_nummer: emptyToNull(form.kunden_nummer),
      leistung: emptyToNull(form.leistung),
      empfaenger_uid: emptyToNull(form.empfaenger_uid),
      empfaenger_name: form.empfaenger_name,
      empfaenger_strasse: emptyToNull(form.empfaenger_strasse),
      empfaenger_plz: emptyToNull(form.empfaenger_plz),
      empfaenger_ort: emptyToNull(form.empfaenger_ort),
      betreff: emptyToNull(form.betreff),
      angebot_nr: emptyToNull(form.angebot_nr),
      angebot_datum: emptyToNull(form.angebot_datum),
      bauseits: form.bauseits.map((b) => b.value).filter((v) => v.trim() !== ""),
    })
    .select("id")
    .single();

  if (error) throw error;

  if (form.positionen.length > 0) {
    const rows = form.positionen.map((p, idx) => ({
      lieferschein_id: ls.id,
      pos_nr: idx + 1,
      menge: p.menge,
      einheit: p.einheit,
      bezeichnung: p.bezeichnung,
      rabatt_eur: p.rabatt_eur,
    }));
    const { error: posErr } = await supabase.from("lieferschein_positionen").insert(rows);
    if (posErr) throw posErr;
  }

  return ls.id;
}

export async function updateLieferschein(id: string, form: LieferscheinFormData): Promise<void> {
  const { error } = await supabase
    .from("lieferscheine")
    .update({
      kunde_id: form.kunde_id ?? null,
      lieferschein_datum: form.lieferschein_datum,
      kunden_nummer: emptyToNull(form.kunden_nummer),
      leistung: emptyToNull(form.leistung),
      empfaenger_uid: emptyToNull(form.empfaenger_uid),
      empfaenger_name: form.empfaenger_name,
      empfaenger_strasse: emptyToNull(form.empfaenger_strasse),
      empfaenger_plz: emptyToNull(form.empfaenger_plz),
      empfaenger_ort: emptyToNull(form.empfaenger_ort),
      betreff: emptyToNull(form.betreff),
      angebot_nr: emptyToNull(form.angebot_nr),
      angebot_datum: emptyToNull(form.angebot_datum),
      bauseits: form.bauseits.map((b) => b.value).filter((v) => v.trim() !== ""),
    })
    .eq("id", id);
  if (error) throw error;

  // Atomar: DELETE + INSERT der Positionen in einer Server-Transaktion.
  // Falls eine Zeile Validation verletzt, wird die ganze Operation rolled back.
  const { error: rpcErr } = await supabase.rpc("replace_lieferschein_positionen", {
    _lieferschein_id: id,
    _positionen: form.positionen.map((p) => ({
      menge: p.menge,
      einheit: p.einheit,
      bezeichnung: p.bezeichnung,
      rabatt_eur: p.rabatt_eur,
    })),
  });
  if (rpcErr) throw rpcErr;
}

export async function deleteLieferschein(id: string): Promise<void> {
  const { error } = await supabase.from("lieferscheine").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadSignature(
  lieferscheinId: string,
  signatureDataUrl: string,
  ort: string,
  datum: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { data: ls } = await supabase
    .from("lieferscheine")
    .select("user_id")
    .eq("id", lieferscheinId)
    .maybeSingle();
  if (!ls) throw new Error("Lieferschein nicht gefunden");

  const ownerId = ls.user_id ?? user.id;
  const path = `${ownerId}/${lieferscheinId}.png`;

  const blob = await (await fetch(signatureDataUrl)).blob();

  const { error: upErr } = await supabase.storage
    .from("lieferschein-signatures")
    .upload(path, blob, { upsert: true, contentType: "image/png" });
  if (upErr) throw upErr;

  const { error: updErr } = await supabase
    .from("lieferscheine")
    .update({
      unterschrift_image_url: path,
      unterschrift_ort: emptyToNull(ort),
      unterschrift_datum: datum || null,
      status: "unterschrieben",
    })
    .eq("id", lieferscheinId);
  if (updErr) throw updErr;
}

export async function getSignatureUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("lieferschein-signatures")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Lädt den vollen Lieferschein, rendert das PDF und triggert einen Download.
 * Wirft Fehler bei IO-Problemen — Aufrufer soll diese mit Toast abfangen.
 */
export async function downloadLieferscheinPdf(id: string): Promise<void> {
  const ls = await getLieferschein(id);
  if (!ls) throw new Error("Lieferschein nicht gefunden");

  const signatureUrl = ls.unterschrift_image_url
    ? await getSignatureUrl(ls.unterschrift_image_url)
    : null;

  const blob = await pdf(
    React.createElement(LieferscheinPdf, { ls, signatureUrl }),
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ls.nummer.replace("/", "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t === "" ? null : t;
}
