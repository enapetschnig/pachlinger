import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { normalizeAtPhone } from "@/lib/phone";

export default function Onboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvingToken, setResolvingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Token bevorzugen — sicherer/sauberer Link aus SMS
  useEffect(() => {
    const token = params.get("t");
    if (token) {
      setResolvingToken(true);
      (async () => {
        try {
          const { data, error } = await supabase.rpc("resolve_phone_invite", {
            _token: token,
          });
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          if (!row?.phone) {
            setTokenError(
              "Einladung ungültig oder bereits verwendet. Bitte den Admin um eine neue Einladung bitten.",
            );
            return;
          }
          setPhone(row.phone);
          if (row.vorname) setVorname(row.vorname);
          if (row.nachname) setNachname(row.nachname);
        } catch (e: any) {
          setTokenError(e.message ?? "Einladung konnte nicht geladen werden.");
        } finally {
          setResolvingToken(false);
        }
      })();
      return;
    }
    // Fallback: Phone direkt aus URL (Legacy-Links)
    const p = params.get("p");
    if (p) {
      const norm = normalizeAtPhone(p);
      setPhone(norm ?? p);
    }
  }, [params]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeAtPhone(phone);
    if (!normalized) {
      toast({
        variant: "destructive",
        title: "Telefonnummer ungültig",
        description: "Bitte gib eine gültige Nummer ein, z.B. +43 664 123 4567",
      });
      return;
    }
    if (!vorname.trim() || !nachname.trim()) {
      toast({
        variant: "destructive",
        title: "Name fehlt",
        description: "Bitte Vor- und Nachname eingeben.",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Passwort zu kurz",
        description: "Mindestens 6 Zeichen.",
      });
      return;
    }
    if (password !== passwordRepeat) {
      toast({
        variant: "destructive",
        title: "Passwörter stimmen nicht überein",
        description: "Bitte beide Passwörter exakt gleich eingeben.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        phone: normalized,
        password,
        options: {
          data: { vorname: vorname.trim(), nachname: nachname.trim() },
        },
      });
      if (error) throw error;
      toast({
        title: "Willkommen!",
        description: "Du bist jetzt angemeldet.",
      });
      navigate("/");
    } catch (err: any) {
      const msg = err?.message ?? "Registrierung fehlgeschlagen.";
      // User existiert bereits → versuch Login
      if (/already|registered|exists/i.test(msg)) {
        try {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            phone: normalized,
            password,
          });
          if (signInErr) throw signInErr;
          toast({ title: "Erfolgreich angemeldet" });
          navigate("/");
          return;
        } catch (e2: any) {
          toast({
            variant: "destructive",
            title: "Anmeldung fehlgeschlagen",
            description:
              "Diese Telefonnummer ist schon registriert. Falls du dein Passwort vergessen hast, melde dich beim Büro.",
          });
          return;
        }
      }
      toast({ variant: "destructive", title: "Fehler", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo size="lg" />
          </div>
          <CardDescription>Mitarbeiter-Registrierung</CardDescription>
        </CardHeader>
        <CardContent>
          {resolvingToken ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Einladung wird geladen…
            </div>
          ) : tokenError ? (
            <div className="space-y-3 py-4">
              <p className="text-sm text-destructive font-medium">{tokenError}</p>
              <p className="text-xs text-muted-foreground">
                Bitte beim Pachlinger-Büro melden — du brauchst eine neue Einladung.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ob-vorname">Vorname</Label>
                  <Input
                    id="ob-vorname"
                    autoComplete="given-name"
                    value={vorname}
                    onChange={(e) => setVorname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-nachname">Nachname</Label>
                  <Input
                    id="ob-nachname"
                    autoComplete="family-name"
                    value={nachname}
                    onChange={(e) => setNachname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-phone">Telefonnummer</Label>
                <Input
                  id="ob-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+43 664 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-password">Passwort wählen</Label>
                <Input
                  id="ob-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="mindestens 6 Zeichen"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-password-repeat">Passwort wiederholen</Label>
                <Input
                  id="ob-password-repeat"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={passwordRepeat}
                  onChange={(e) => setPasswordRepeat(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Registrieren & anmelden
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Mit der Registrierung bist du sofort angemeldet. Merke dir Telefon­nummer
                und Passwort — damit kannst du dich später jederzeit wieder anmelden.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
