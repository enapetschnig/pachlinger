import { useEffect, useState } from "react";
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
import {
  MessageSquare,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseInviteLines } from "@/lib/phone";
import { sendInvites, InviteResult } from "@/lib/invites";
import { supabase } from "@/integrations/supabase/client";

interface PendingInvite {
  phone: string;
  vorname: string | null;
  nachname: string | null;
  created_at: string;
}

export function InviteMitarbeiterCard() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [resendingPhone, setResendingPhone] = useState<string | null>(null);
  const [revokingPhone, setRevokingPhone] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      const { data, error } = await supabase
        .from("phone_invites")
        .select("phone, vorname, nachname, created_at")
        .is("used_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPending((data ?? []) as PendingInvite[]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Laden", description: e.message });
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

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
      await loadPending();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (p: PendingInvite) => {
    setResendingPhone(p.phone);
    try {
      const res = await sendInvites([
        {
          phone: p.phone,
          vorname: p.vorname ?? undefined,
          nachname: p.nachname ?? undefined,
        },
      ]);
      if (res[0]?.ok) {
        toast({ title: "Einladung erneut gesendet" });
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: res[0]?.error ?? "Erneut-Senden fehlgeschlagen.",
        });
      }
      await loadPending();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setResendingPhone(null);
    }
  };

  const handleRevoke = async (phone: string) => {
    setRevokingPhone(phone);
    try {
      const { error } = await supabase.from("phone_invites").delete().eq("phone", phone);
      if (error) throw error;
      toast({ title: "Einladung widerrufen" });
      await loadPending();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setRevokingPhone(null);
    }
  };

  const fmtName = (i: PendingInvite) => {
    const n = [i.vorname, i.nachname].filter(Boolean).join(" ").trim();
    return n || "—";
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mitarbeiter einladen
        </CardTitle>
        <CardDescription>
          Eine Person pro Zeile — am besten Name UND Telefonnummer eingeben, dann
          ist der Name bei der Registrierung schon vorausgewählt.
          <br />
          Beispiel: <span className="font-mono text-xs">Max Mustermann, +43 664 123 4567</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-text">Einladungen</Label>
          <Textarea
            id="invite-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Max Mustermann, +43 664 123 4567\nMaria Beispiel, 0664 9876543"}
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
            <p className="text-xs text-muted-foreground">Letzter Versand:</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {r.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                )}
                <span className="font-mono text-xs">{r.phone}</span>
                {!r.ok && <span className="text-xs text-destructive">— {r.error}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Aktive (noch nicht angenommene) Einladungen */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Offene Einladungen</h3>
            {pending.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {pending.length} ausstehend
              </span>
            )}
          </div>

          {loadingPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lädt...
            </div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              Keine offenen Einladungen. Eingeladene Personen, die sich registriert
              haben, erscheinen unten in der Benutzer-Liste.
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.phone}
                  className="flex items-center gap-3 p-2 sm:p-3 rounded-md border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{fmtName(p)}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.phone}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Eingeladen am {fmtDate(p.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleResend(p)}
                    disabled={resendingPhone === p.phone}
                    title="Einladung erneut senden"
                  >
                    {resendingPhone === p.phone ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(p.phone)}
                    disabled={revokingPhone === p.phone}
                    title="Einladung widerrufen"
                  >
                    {revokingPhone === p.phone ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
