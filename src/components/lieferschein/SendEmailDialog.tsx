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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendLieferscheinEmail } from "@/lib/email";
import { getAppSettings, AppSettings } from "@/lib/settings";
import { LieferscheinWithPositions } from "@/lib/lieferschein";
import { getKunde } from "@/lib/kunden";

interface Props {
  open: boolean;
  ls: LieferscheinWithPositions;
  onClose: () => void;
  onSent: () => void;
}

export function SendEmailDialog({ open, ls, onClose, onSent }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [kundeEmail, setKundeEmail] = useState("");
  const [sendToKunde, setSendToKunde] = useState(true);
  const [sendToBuero, setSendToBuero] = useState(true);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const s = await getAppSettings();
        setSettings(s);
        setSendToBuero(!!s?.auto_send_to_buero && !!s?.buero_email);

        // Kunden-E-Mail vorbefüllen
        let mail = "";
        if (ls.kunde_id) {
          const k = await getKunde(ls.kunde_id);
          if (k?.email) mail = k.email;
        }
        setKundeEmail(mail);
        setSendToKunde(mail !== "");

        setSubject(`Lieferschein ${ls.nummer}`);
        setBodyText("");
      } catch (e: any) {
        toast({ variant: "destructive", title: "Fehler", description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, ls, toast]);

  const handleSend = async () => {
    const kundeList = sendToKunde && kundeEmail.trim() ? [kundeEmail.trim()] : [];
    const bueroList = sendToBuero && settings?.buero_email ? [settings.buero_email] : [];
    if (kundeList.length === 0 && bueroList.length === 0) {
      toast({
        variant: "destructive",
        title: "Keine Empfänger",
        description: "Bitte mindestens eine E-Mail-Adresse angeben.",
      });
      return;
    }
    setSending(true);
    try {
      await sendLieferscheinEmail({
        lieferschein_id: ls.id,
        to_kunde: kundeList,
        to_buero: bueroList,
        subject,
        body: bodyText,
      });
      const recvCount = kundeList.length + bueroList.length;
      toast({
        title: "E-Mail versendet",
        description: `An ${recvCount} ${recvCount === 1 ? "Empfänger" : "Empfänger"}.`,
      });
      onSent();
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Versand fehlgeschlagen", description: e.message });
    } finally {
      setSending(false);
    }
  };

  const bueroSet = !!settings?.buero_email;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Lieferschein per E-Mail senden
          </DialogTitle>
          <DialogDescription>
            Lieferschein {ls.nummer} wird als PDF angehängt. Reply-To ist die im
            Adminbereich hinterlegte Büro-E-Mail.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lädt...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-kunde"
                  checked={sendToKunde}
                  onCheckedChange={(v) => setSendToKunde(!!v)}
                />
                <Label htmlFor="send-kunde" className="cursor-pointer">
                  An Kunden senden
                </Label>
              </div>
              <Input
                type="email"
                placeholder="kunde@firma.at"
                value={kundeEmail}
                onChange={(e) => setKundeEmail(e.target.value)}
                disabled={!sendToKunde}
              />
            </div>

            <div className="flex items-start gap-2 border rounded-md p-3 bg-muted/30">
              <Checkbox
                id="send-buero"
                checked={sendToBuero}
                disabled={!bueroSet}
                onCheckedChange={(v) => setSendToBuero(!!v)}
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="send-buero"
                  className={`cursor-pointer ${!bueroSet ? "text-muted-foreground" : ""}`}
                >
                  Kopie ans Büro
                </Label>
                <p className="text-xs text-muted-foreground">
                  {bueroSet ? (
                    <>An <span className="font-mono">{settings?.buero_email}</span> als BCC</>
                  ) : (
                    "Keine Büro-E-Mail im Adminbereich hinterlegt."
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Betreff</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-body">Nachricht (optional)</Label>
              <Textarea
                id="email-body"
                rows={3}
                placeholder="z.B. Hinweis zur Lieferung, Ansprechpartner, etc."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Abbrechen
          </Button>
          <Button onClick={handleSend} disabled={loading || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
