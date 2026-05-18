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
  assigned_to: string | null;
  assigned_at: string | null;
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
  empfaenger_email: string | null;
  empfaenger_telefon: string | null;
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
  assigned_to: string | null;
  lieferschein_datum: string;
  kunden_nummer: string;
  leistung: string;
  empfaenger_uid: string;
  empfaenger_name: string;
  empfaenger_strasse: string;
  empfaenger_plz: string;
  empfaenger_ort: string;
  empfaenger_email: string;
  empfaenger_telefon: string;
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
      assigned_to: form.assigned_to ?? null,
      assigned_at: form.assigned_to ? new Date().toISOString() : null,
      lieferschein_datum: form.lieferschein_datum,
      kunden_nummer: emptyToNull(form.kunden_nummer),
      leistung: emptyToNull(form.leistung),
      empfaenger_uid: emptyToNull(form.empfaenger_uid),
      empfaenger_name: form.empfaenger_name,
      empfaenger_strasse: emptyToNull(form.empfaenger_strasse),
      empfaenger_plz: emptyToNull(form.empfaenger_plz),
      empfaenger_ort: emptyToNull(form.empfaenger_ort),
      empfaenger_email: emptyToNull(form.empfaenger_email),
      empfaenger_telefon: emptyToNull(form.empfaenger_telefon),
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
  // assigned_at nur neu setzen wenn die Zuordnung sich geändert hat
  const { data: existing } = await supabase
    .from("lieferscheine")
    .select("assigned_to")
    .eq("id", id)
    .maybeSingle();
  const newAssigned = form.assigned_to ?? null;
  const oldAssigned = existing?.assigned_to ?? null;
  const assignmentChanged = newAssigned !== oldAssigned;

  const { error } = await supabase
    .from("lieferscheine")
    .update({
      kunde_id: form.kunde_id ?? null,
      assigned_to: newAssigned,
      ...(assignmentChanged
        ? { assigned_at: newAssigned ? new Date().toISOString() : null }
        : {}),
      lieferschein_datum: form.lieferschein_datum,
      kunden_nummer: emptyToNull(form.kunden_nummer),
      leistung: emptyToNull(form.leistung),
      empfaenger_uid: emptyToNull(form.empfaenger_uid),
      empfaenger_name: form.empfaenger_name,
      empfaenger_strasse: emptyToNull(form.empfaenger_strasse),
      empfaenger_plz: emptyToNull(form.empfaenger_plz),
      empfaenger_ort: emptyToNull(form.empfaenger_ort),
      empfaenger_email: emptyToNull(form.empfaenger_email),
      empfaenger_telefon: emptyToNull(form.empfaenger_telefon),
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

  // Pfad basiert auf signing user (nicht owner) — damit auch zugewiesene
  // Mitarbeiter via Storage-RLS in ihren eigenen Ordner schreiben dürfen.
  const path = `${user.id}/${lieferscheinId}.png`;

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
 * Lädt den vollen Lieferschein und gibt das gerenderte PDF als Blob zurück.
 * Wird sowohl vom Download als auch vom Sign-Dialog (Vorschau) genutzt.
 */
export async function renderLieferscheinPdfBlob(
  id: string,
): Promise<{ blob: Blob; nummer: string }> {
  const ls = await getLieferschein(id);
  if (!ls) throw new Error("Lieferschein nicht gefunden");
  const signatureUrl = ls.unterschrift_image_url
    ? await getSignatureUrl(ls.unterschrift_image_url)
    : null;
  // Cast: LieferscheinPdf rendert ein <Document>, aber TypeScript erkennt
  // den FunctionComponent-Typ nicht als DocumentProps.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(LieferscheinPdf, { ls, signatureUrl }) as any;
  const blob = await pdf(element).toBlob();
  return { blob, nummer: ls.nummer };
}

/**
 * Lädt den vollen Lieferschein, rendert das PDF und triggert einen Download.
 * Wirft Fehler bei IO-Problemen — Aufrufer soll diese mit Toast abfangen.
 */
export async function downloadLieferscheinPdf(id: string): Promise<void> {
  const { blob, nummer } = await renderLieferscheinPdfBlob(id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nummer.replace("/", "_")}.pdf`;
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
