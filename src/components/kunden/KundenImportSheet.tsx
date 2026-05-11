import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload, FileText, Image, Type, Sparkles } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parseCustomersText, parseCustomersImage, ParsedCustomer } from "@/lib/openai";
import { bulkCreateKunden, KundeInput } from "@/lib/kunden";

interface Props {
  onDone: (count: number) => void;
}

const empty = (): ParsedCustomer => ({
  name: "",
  strasse: "",
  plz: "",
  ort: "",
  kunden_nummer: "",
  uid_nummer: "",
  email: "",
  telefon: "",
});

async function extractPdfText(file: File): Promise<string> {
  // Lazy-load pdfjs (großer Worker, sonst Cold-Start-Issue)
  const pdfjs = await import("pdfjs-dist");
  // Worker via CDN-fallback (default workerSrc auf legacy build setzen)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return text;
}

export function KundenImportSheet({ onDone }: Props) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedCustomer[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleParseText = async () => {
    if (!text.trim()) {
      toast({ variant: "destructive", title: "Kein Text", description: "Bitte Text einfügen." });
      return;
    }
    setParsing(true);
    try {
      const customers = await parseCustomersText(text);
      if (customers.length === 0) {
        toast({ variant: "destructive", title: "Keine Kunden erkannt", description: "Versuche es mit klareren Daten." });
        return;
      }
      setRows([...rows, ...customers]);
      setText("");
      toast({ title: `${customers.length} Kunde${customers.length === 1 ? "" : "n"} erkannt` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setParsing(false);
    }
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      let extracted = "";
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".csv")) {
        const txt = await file.text();
        const r = Papa.parse(txt, { header: false });
        extracted = (r.data as string[][])
          .map((row) => row.filter(Boolean).join(" | "))
          .join("\n");
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        extracted = rows.map((r) => r.filter(Boolean).join(" | ")).join("\n");
      } else if (lower.endsWith(".pdf")) {
        extracted = await extractPdfText(file);
      } else {
        toast({ variant: "destructive", title: "Format nicht unterstützt", description: file.name });
        return;
      }
      if (!extracted.trim()) {
        toast({ variant: "destructive", title: "Datei leer", description: "Keine Daten zum Parsen gefunden." });
        return;
      }
      const customers = await parseCustomersText(extracted);
      setRows((r) => [...r, ...customers]);
      toast({ title: `${customers.length} Kunde${customers.length === 1 ? "" : "n"} aus ${file.name} erkannt` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Parsen", description: e.message });
    } finally {
      setParsing(false);
    }
  };

  const handleImage = async (file: File) => {
    setParsing(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const customers = await parseCustomersImage(dataUrl);
      setRows((r) => [...r, ...customers]);
      toast({ title: `${customers.length} Kunde${customers.length === 1 ? "" : "n"} aus Bild erkannt` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (idx: number, field: keyof ParsedCustomer, value: string) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const removeRow = (idx: number) => {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    const valid = rows.filter((r) => r.name.trim() !== "");
    if (valid.length === 0) {
      toast({ variant: "destructive", title: "Keine gültigen Zeilen", description: "Jeder Kunde braucht mindestens einen Namen." });
      return;
    }
    setImporting(true);
    try {
      const inputs: KundeInput[] = valid.map((r) => ({
        name: r.name,
        strasse: r.strasse,
        plz: r.plz,
        ort: r.ort,
        kunden_nummer: r.kunden_nummer,
        uid_nummer: r.uid_nummer,
        email: r.email,
        telefon: r.telefon,
      }));
      const created = await bulkCreateKunden(inputs);
      toast({ title: `${created.length} Kunden importiert` });
      onDone(created.length);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import fehlgeschlagen", description: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Lade eine Datei hoch oder füge Freitext ein. Die KI extrahiert strukturierte Kundendaten,
          die du vor dem Import noch anpassen kannst.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImage(f);
              if (imgInputRef.current) imgInputRef.current.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="justify-start"
          >
            <FileText className="h-4 w-4 mr-2" />
            CSV/Excel/PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => imgInputRef.current?.click()}
            disabled={parsing}
            className="justify-start"
          >
            <Image className="h-4 w-4 mr-2" />
            Foto
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-text" className="flex items-center gap-2">
            <Type className="h-4 w-4" /> Freitext
          </Label>
          <Textarea
            id="import-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Liste Kunden hier rein (eine pro Zeile, beliebiges Format) — z.B. 'Firma Müller, Hauptstr 12, 8010 Graz, ATU12345678'"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleParseText}
            disabled={parsing || !text.trim()}
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Mit KI erkennen
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Erkannte Kunden ({rows.length})</h3>
            <Button size="sm" variant="ghost" onClick={() => setRows([])}>
              Liste leeren
            </Button>
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-auto pr-2">
            {rows.map((r, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                <div className="flex items-start gap-2">
                  <Input
                    className="font-semibold"
                    placeholder="Name / Firma *"
                    value={r.name}
                    onChange={(e) => updateRow(idx, "name", e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(idx)}
                    className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                    title="Zeile entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Straße"
                  value={r.strasse}
                  onChange={(e) => updateRow(idx, "strasse", e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="PLZ"
                    value={r.plz}
                    onChange={(e) => updateRow(idx, "plz", e.target.value)}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Ort"
                    value={r.ort}
                    onChange={(e) => updateRow(idx, "ort", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Kundennummer"
                    value={r.kunden_nummer}
                    onChange={(e) => updateRow(idx, "kunden_nummer", e.target.value)}
                  />
                  <Input
                    placeholder="UID"
                    value={r.uid_nummer}
                    onChange={(e) => updateRow(idx, "uid_nummer", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="E-Mail"
                    value={r.email}
                    onChange={(e) => updateRow(idx, "email", e.target.value)}
                  />
                  <Input
                    placeholder="Telefon"
                    value={r.telefon}
                    onChange={(e) => updateRow(idx, "telefon", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button onClick={handleImport} disabled={importing || rows.length === 0} className="w-full">
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {rows.length} {rows.length === 1 ? "Kunde" : "Kunden"} importieren
          </Button>
        </div>
      )}
    </div>
  );
}
