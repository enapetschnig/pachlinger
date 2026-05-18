import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  LieferscheinWithPositions,
  getLieferschein,
  formatDateDe,
} from "@/lib/lieferschein";

interface Props {
  lieferscheinId: string;
}

/**
 * Kompakte HTML-Übersicht des Lieferscheins für den Unterschrift-Dialog.
 * Zeigt dem Kunden auf einen Blick was er unterschreibt:
 * Empfänger, Betreff, Bauseits, alle Positionen.
 * Native HTML — schnell, responsive, auf jedem Browser/OS lesbar.
 */
export function LieferscheinSummary({ lieferscheinId }: Props) {
  const [ls, setLs] = useState<LieferscheinWithPositions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getLieferschein(lieferscheinId);
        if (!cancelled) setLs(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lieferscheinId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Übersicht wird geladen…
      </div>
    );
  }

  if (error || !ls) {
    return (
      <div className="py-6 text-center text-sm text-destructive">
        Übersicht konnte nicht geladen werden.{error ? ` (${error})` : ""}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Lieferschein-Nummer + Datum */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Lieferschein</div>
          <div className="font-mono font-bold text-base text-primary">{ls.nummer}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Datum</div>
          <div className="font-semibold">{formatDateDe(ls.lieferschein_datum)}</div>
        </div>
      </div>

      {/* Empfänger */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Empfänger</div>
        <div className="font-semibold">{ls.empfaenger_name}</div>
        {ls.empfaenger_strasse && <div>{ls.empfaenger_strasse}</div>}
        {(ls.empfaenger_plz || ls.empfaenger_ort) && (
          <div>{[ls.empfaenger_plz, ls.empfaenger_ort].filter(Boolean).join(" ")}</div>
        )}
      </div>

      {/* Betreff */}
      {ls.betreff && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Betreff</div>
          <div className="font-semibold">{ls.betreff}</div>
          {ls.angebot_nr && (
            <div className="text-xs text-muted-foreground mt-1">
              Angebot {ls.angebot_nr}
              {ls.angebot_datum ? ` vom ${formatDateDe(ls.angebot_datum)}` : ""}
            </div>
          )}
        </div>
      )}

      {/* Bauseits */}
      {ls.bauseits.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bauseits</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {ls.bauseits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Positionen */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Positionen ({ls.positionen.length})
        </div>
        {ls.positionen.length === 0 ? (
          <div className="text-muted-foreground italic">Keine Positionen</div>
        ) : (
          <div className="space-y-1.5">
            {ls.positionen.map((p) => {
              const menge = Number(p.menge).toLocaleString("de-DE", {
                maximumFractionDigits: 3,
              });
              const rabatt =
                p.rabatt_eur !== null && p.rabatt_eur !== undefined && Number(p.rabatt_eur) > 0
                  ? Number(p.rabatt_eur).toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : null;
              return (
                <div key={p.id ?? p.pos_nr} className="flex items-start gap-3 py-1.5 border-b last:border-b-0">
                  <span className="font-mono text-xs text-muted-foreground w-5 shrink-0 pt-0.5">
                    {p.pos_nr}
                  </span>
                  <span className="font-mono text-xs w-20 shrink-0 pt-0.5">
                    {menge} {p.einheit}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold whitespace-pre-wrap break-words">
                      {p.bezeichnung}
                    </div>
                    {rabatt && (
                      <div className="text-xs text-muted-foreground">Rabatt EUR {rabatt}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
