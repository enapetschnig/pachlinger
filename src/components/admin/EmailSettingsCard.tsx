import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAppSettings, updateAppSettings, AppSettings } from "@/lib/settings";

export function EmailSettingsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [buroEmail, setBuroEmail] = useState("");
  const [autoSend, setAutoSend] = useState(true);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("Pachlinger GmbH");

  useEffect(() => {
    (async () => {
      try {
        const s = await getAppSettings();
        setSettings(s);
        if (s) {
          setBuroEmail(s.buero_email ?? "");
          setAutoSend(s.auto_send_to_buero);
          setSenderEmail(s.sender_email ?? "");
          setSenderName(s.sender_name ?? "Pachlinger GmbH");
        }
      } catch (e: any) {
        toast({ variant: "destructive", title: "Fehler beim Laden", description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAppSettings({
        buero_email: buroEmail,
        auto_send_to_buero: autoSend,
        sender_email: senderEmail,
        sender_name: senderName,
      });
      setSettings(updated);
      toast({ title: "Einstellungen gespeichert" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          E-Mail-Einstellungen
        </CardTitle>
        <CardDescription>
          Wohin Lieferscheine als Kopie geschickt werden und welche Absender-Adresse
          erscheint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lädt...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="buro-email">Büro-E-Mail (Reply-To + Kopie)</Label>
              <Input
                id="buro-email"
                type="email"
                placeholder="buero@pachlinger.at"
                value={buroEmail}
                onChange={(e) => setBuroEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Wird bei jedem Lieferschein-Versand als Reply-To gesetzt und —
                wenn der Schalter unten aktiv ist — als verdeckte Kopie mitgeschickt.
              </p>
            </div>

            <div className="flex items-center justify-between border rounded-md p-3">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="auto-send">Automatisch ans Büro senden</Label>
                <p className="text-xs text-muted-foreground">
                  Beim Versand an einen Kunden wird die Büro-E-Mail automatisch
                  als verdeckte Kopie mitgeschickt.
                </p>
              </div>
              <Switch
                id="auto-send"
                checked={autoSend}
                onCheckedChange={setAutoSend}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="sender-name">Absender-Name</Label>
                <Input
                  id="sender-name"
                  placeholder="Pachlinger GmbH"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-email">Absender-E-Mail (optional)</Label>
                <Input
                  id="sender-email"
                  type="email"
                  placeholder="lieferschein@pachlinger.at"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Nur möglich wenn die Domain bei Resend verifiziert ist.
                  Leer lassen → Standard-Absender.
                </p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
