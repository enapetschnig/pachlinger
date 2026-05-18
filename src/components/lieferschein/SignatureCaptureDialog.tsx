import { useEffect, useState } from "react";
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
import { Loader2, Maximize2, X } from "lucide-react";
import { renderLieferscheinPdfBlob, uploadSignature } from "@/lib/lieferschein";
import { renderPdfBlobToImages } from "@/lib/pdf-preview";

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

  // Vorschau: PDF → PNG-Bilder (eine pro Seite). Funktioniert auf allen Mobile-Browsern.
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreviewImages([]);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const { blob } = await renderLieferscheinPdfBlob(lieferscheinId);
        if (cancelled) return;
        const images = await renderPdfBlobToImages(blob, 1.5);
        if (cancelled) return;
        setPreviewImages(images);
      } catch (e: any) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Vorschau-Fehler",
            description: e.message,
          });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, lieferscheinId, toast]);

  const handleSubmit = async () => {
    if (!signature) {
      toast({
        variant: "destructive",
        title: "Keine Unterschrift",
        description: "Bitte unterschreiben Sie zunächst.",
      });
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
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Lieferschein unterschreiben</DialogTitle>
            <DialogDescription>
              Bitte den Kunden den Lieferschein lesen lassen und dann unterschreiben.
            </DialogDescription>
          </DialogHeader>

          {/* PDF-Vorschau als Bilder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Vorschau</Label>
              {previewImages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFullscreenOpen(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1" />
                  Vergrößern
                </Button>
              )}
            </div>
            <div className="border rounded-md overflow-auto bg-white max-h-[240px] sm:max-h-[360px]">
              {previewLoading ? (
                <div className="flex items-center justify-center gap-2 h-[240px] text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vorschau wird erstellt…
                </div>
              ) : previewImages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="block w-full text-left"
                  aria-label="Vorschau vergrößern"
                >
                  {previewImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Seite ${i + 1}`}
                      className="block w-full h-auto"
                    />
                  ))}
                </button>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
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

      {/* Fullscreen-Vorschau — auf Mobile besonders nützlich */}
      {fullscreenOpen && previewImages.length > 0 && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 overflow-auto"
          onClick={() => setFullscreenOpen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreenOpen(false)}
            className="fixed top-4 right-4 z-[61] bg-white rounded-full p-2 shadow-lg"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-h-screen flex items-start justify-center p-2 sm:p-6">
            <div className="bg-white max-w-3xl w-full">
              {previewImages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Seite ${i + 1}`}
                  className="block w-full h-auto"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
