/**
 * Normalisiert Telefonnummern auf E.164 mit Österreich als Default-Land.
 * Akzeptiert:
 *   "+436641234567"     → "+436641234567"
 *   "+43 664 123 4567"  → "+436641234567"
 *   "0664 1234567"      → "+436641234567"
 *   "00 43 664 12345"   → "+4366412345"
 * Gibt `null` zurück, wenn die Eingabe kein erkennbares Format hat.
 */
export function normalizeAtPhone(raw: string): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("0")) s = "+43" + s.slice(1);
  if (!s.startsWith("+")) return null;
  if (!/^\+\d{8,15}$/.test(s)) return null;
  return s;
}

/**
 * Parst eine Textarea-Eingabe mit einer oder mehreren Einladungen pro Zeile.
 *
 * Akzeptiert pro Zeile:
 *   "+436641234567"
 *   "Max Mustermann, +436641234567"
 *   "+436641234567 Max Mustermann"
 *   "Max +436641234567"
 *
 * Returnt nur erfolgreich geparste Einladungen (mit normalisierter Phone).
 */
export interface ParsedInvite {
  phone: string;
  vorname?: string;
  nachname?: string;
}

export function parseInviteLines(text: string): {
  invites: ParsedInvite[];
  errors: string[];
} {
  const invites: ParsedInvite[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");

  for (const line of lines) {
    // Phone-Teil rauslesen (alles ab + bis Whitespace/Komma)
    const phoneMatch = line.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    if (!phoneMatch) {
      errors.push(`Keine Telefonnummer erkennbar: "${line}"`);
      continue;
    }
    const phone = normalizeAtPhone(phoneMatch[1]);
    if (!phone) {
      errors.push(`Ungültiges Telefonformat: "${phoneMatch[1]}"`);
      continue;
    }
    // Rest = Name (alles außer dem matchten Phone-Teil)
    const namePart = line
      .replace(phoneMatch[1], "")
      .replace(/^[,;\-\s]+|[,;\-\s]+$/g, "")
      .trim();
    let vorname: string | undefined;
    let nachname: string | undefined;
    if (namePart) {
      const tokens = namePart.split(/\s+/);
      vorname = tokens[0];
      if (tokens.length > 1) nachname = tokens.slice(1).join(" ");
    }
    invites.push({ phone, vorname, nachname });
  }

  return { invites, errors };
}
