import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { renderLieferscheinPdfBlob, uploadSignature } from "@/lib/lieferschein";

interface Props {
  open: boolean;
  lieferscheinId: string;
  defaultOrt?: string;
  cancelLabel?: string;
  onClose: () => void;
  onSigned: () => void;
}

export function SignatureCaptureDialog({
  open,
  lieferscheinId,
  defaultOrt,
  cancelLabel = "Abbrechen",
  onClose,
  onSigned,
}: Props) {
  const { toast } = useToast();
  const [signature, setSignature] = useState<string | null>(null);
  // Pachlinger-Heimatort als sinnvoller Default — Mitarbeiter kann überschreiben
  const [ort, setOrt] = useState(defaultOrt && defaultOrt.trim() !== "" ? defaultOrt : "Teufenbach");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // PDF-Vorschau: rendert das echte Versand-PDF in einem iframe
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Beim Schließen alten URL freigeben
    if (!open) {
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
      setPdfUrl(null);
      return;
    }

    let cancelled = false;
    setPdfLoading(true);
    (async () => {
      try {
        const { blob } = await renderLieferscheinPdfBlob(lieferscheinId);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        // Alten URL freigeben falls Dialog neu geöffnet wurde
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = url;
        setPdfUrl(url);
      } catch (e: any) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Vorschau-Fehler",
            description: e.message,
          });
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, lieferscheinId, toast]);

  const handleSubmit = async () => {
    if (!signature) {
      toast({ variant: "destructive", title: "Keine Unterschrift", description: "Bitte unterschreiben Sie zunächst." });
      return;
    }
    setSubmitting(true);
    try {
      await uploadSignature(lieferscheinId, signature, ort, datum);
      toast({ title: "Lieferschein unterschrieben" });
      onSigned();
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Lieferschein unterschreiben</DialogTitle>
          <DialogDescription>
            Bitte den Kunden den Lieferschein lesen lassen und dann unterschreiben.
          </DialogDescription>
        </DialogHeader>

        {/* PDF-Vorschau */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Vorschau</Label>
          <div className="border rounded-md overflow-hidden bg-muted/30">
            {pdfLoading ? (
              <div className="flex items-center justify-center gap-2 h-[300px] text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vorschau wird erstellt…
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                title="Lieferschein-Vorschau"
                className="w-full h-[300px] sm:h-[420px] bg-white"
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                Keine Vorschau verfügbar
              </div>
            )}
          </div>
        </div>

        {/* Ort + Datum */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sig-ort">Ort</Label>
            <Input id="sig-ort" value={ort} onChange={(e) => setOrt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-datum">Datum</Label>
            <Input
              id="sig-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
        </div>

        {/* Signatur-Pad */}
        <div>
          <Label className="mb-2 block">Unterschrift</Label>
          <SignaturePad onSignatureChange={setSignature} />
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !signature}>
            {submitting ? "Speichert..." : "Unterschrift speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
