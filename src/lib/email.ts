import React from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { LieferscheinPdf } from "@/components/lieferschein/LieferscheinPdf";
import { getLieferschein, getSignatureUrl } from "./lieferschein";

export interface SendLieferscheinEmailInput {
  lieferschein_id: string;
  to_kunde: string[];
  to_buero: string[];
  reply_to?: string;
  subject?: string;
  body?: string;
}

export interface SendLieferscheinEmailResult {
  success: boolean;
  id?: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function sendLieferscheinEmail(
  input: SendLieferscheinEmailInput,
): Promise<SendLieferscheinEmailResult> {
  // 1. Lieferschein laden + PDF rendern
  const ls = await getLieferschein(input.lieferschein_id);
  if (!ls) throw new Error("Lieferschein nicht gefunden");

  const signatureUrl = ls.unterschrift_image_url
    ? await getSignatureUrl(ls.unterschrift_image_url)
    : null;

  const blob = await pdf(
    React.createElement(LieferscheinPdf, { ls, signatureUrl }),
  ).toBlob();
  const pdf_base64 = await blobToBase64(blob);
  const pdf_filename = `${ls.nummer.replace("/", "_")}.pdf`;

  // 2. Edge Function aufrufen
  const { data, error } = await supabase.functions.invoke("send-lieferschein-email", {
    body: {
      lieferschein_id: ls.id,
      nummer: ls.nummer,
      to_kunde: input.to_kunde.filter((e) => e.trim() !== ""),
      to_buero: input.to_buero.filter((e) => e.trim() !== ""),
      reply_to: input.reply_to,
      subject: input.subject,
      body: input.body,
      pdf_base64,
      pdf_filename,
    },
  });
  if (error) throw new Error(error.message || "E-Mail-Versand fehlgeschlagen");
  if (data?.error) throw new Error(data.error);
  return { success: true, id: data?.id };
}
