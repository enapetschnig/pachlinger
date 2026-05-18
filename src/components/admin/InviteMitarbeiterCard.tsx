import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseInviteLines } from "@/lib/phone";
import { sendInvites, InviteResult } from "@/lib/invites";

export function InviteMitarbeiterCard() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);

  const handleSend = async () => {
    const { invites, errors } = parseInviteLines(text);
    if (invites.length === 0) {
      toast({
        variant: "destructive",
        title: "Keine Einladungen erkannt",
        description: errors[0] ?? "Bitte mindestens eine Telefonnummer eingeben.",
      });
      return;
    }
    setSending(true);
    setResults(null);
    try {
      const res = await sendInvites(invites);
      setResults(res);
      const ok = res.filter((r) => r.ok).length;
      const failed = res.length - ok;
      toast({
        title: `${ok} SMS versendet${failed > 0 ? `, ${failed} fehlgeschlagen` : ""}`,
      });
      if (failed === 0) setText("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mitarbeiter einladen
        </CardTitle>
        <CardDescription>
          Eine Telefonnummer pro Zeile — optional mit Name davor. Beispiel:{" "}
          <span className="font-mono text-xs">Max Mustermann, +43 664 123 4567</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="invite-text">Einladungen</Label>
          <Textarea
            id="invite-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"+43 664 123 4567\nMaria Beispiel, 0664 9876543"}
            className="font-mono text-sm"
          />
        </div>

        <Button onClick={handleSend} disabled={sending || !text.trim()}>
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Einladungen senden
        </Button>

        {results && results.length > 0 && (
          <div className="pt-3 border-t space-y-1">
            <p className="text-xs text-muted-foreground">Ergebnis:</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {r.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                )}
                <span className="font-mono text-xs">{r.phone}</span>
                {!r.ok && (
                  <span className="text-xs text-destructive">— {r.error}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
