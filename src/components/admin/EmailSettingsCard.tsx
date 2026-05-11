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
import { getAppSettings, updateAppSettings } from "@/lib/settings";

const SENDER_DISPLAY = "Pachlinger GmbH <pachlinger@handwerkapp.at>";

export function EmailSettingsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buroEmail, setBuroEmail] = useState("");
  const [autoSend, setAutoSend] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await getAppSettings();
        if (s) {
          setBuroEmail(s.buero_email ?? "");
          setAutoSend(s.auto_send_to_buero);
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
      await updateAppSettings({
        buero_email: buroEmail,
        auto_send_to_buero: autoSend,
      });
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
          Wohin Lieferscheine als Kopie geschickt werden und wer als Reply-To erscheint.
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

            <div className="pt-2 border-t text-xs text-muted-foreground">
              Absender ist fest: <span className="font-mono">{SENDER_DISPLAY}</span>
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
