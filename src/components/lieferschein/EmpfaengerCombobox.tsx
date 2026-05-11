import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kunde, searchKunden } from "@/lib/kunden";

export interface EmpfaengerComboboxProps {
  value: string;
  onChange: (v: string) => void;
  onSelectKunde: (k: Kunde) => void;
  onClearKunde: () => void;
  linkedKundeId: string | null | undefined;
  inputId?: string;
  placeholder?: string;
}

export function EmpfaengerCombobox({
  value,
  onChange,
  onSelectKunde,
  onClearKunde,
  linkedKundeId,
  inputId,
  placeholder,
}: EmpfaengerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Kunde[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click-outside schließt das Dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchKunden(value, 10);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={inputId}
          autoComplete="organization"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "Name oder Kundennummer suchen…"}
          className="pl-9 pr-9"
        />
        {linkedKundeId && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={onClearKunde}
            title="Kundenverknüpfung aufheben"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lädt…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              {value.trim() === ""
                ? "Tippen, um zu suchen, oder Name eingeben — wird beim Speichern automatisch als Kunde angelegt."
                : "Keine Treffer. Wird beim Speichern als neuer Kunde angelegt."}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectKunde(k);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium truncate">{k.name}</span>
                      {k.kunden_nummer && (
                        <span className="text-xs font-mono text-muted-foreground">
                          #{k.kunden_nummer}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")]
                        .filter((p) => p && p.length > 0)
                        .join(" · ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {linkedKundeId && (
        <p className="text-xs text-muted-foreground mt-1">Mit Kunde verknüpft</p>
      )}
    </div>
  );
}
