import { useState } from "react";
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
import { uploadSignature } from "@/lib/lieferschein";

interface Props {
  open: boolean;
  lieferscheinId: string;
  defaultOrt?: string;
  onClose: () => void;
  onSigned: () => void;
}

export function SignatureCaptureDialog({ open, lieferscheinId, defaultOrt, onClose, onSigned }: Props) {
  const { toast } = useToast();
  const [signature, setSignature] = useState<string | null>(null);
  const [ort, setOrt] = useState(defaultOrt ?? "");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lieferschein unterschreiben</DialogTitle>
          <DialogDescription>
            Mit der Unterschrift wechselt der Status auf "Unterschrieben".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <div>
            <Label className="mb-2 block">Unterschrift</Label>
            <SignaturePad onSignatureChange={setSignature} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !signature}>
            {submitting ? "Speichert..." : "Unterschrift speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
