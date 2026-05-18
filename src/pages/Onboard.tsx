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
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Phone aus URL-Param vorbefüllen (E.164)
  useEffect(() => {
    const p = params.get("p");
    if (p) {
      const norm = normalizeAtPhone(p);
      setPhone(norm ?? p);
    }
  }, [params]);

  const handleRequestOtp = async (e: React.FormEvent) => {
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
    setRequesting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          channel: "sms",
          data: { vorname: vorname.trim(), nachname: nachname.trim() },
        },
      });
      if (error) throw error;
      toast({
        title: "Code gesendet",
        description: "Du bekommst gleich eine SMS mit deinem Code.",
      });
      setStep("otp");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: err.message ?? "Code-Versand fehlgeschlagen.",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeAtPhone(phone);
    if (!normalized) return;
    if (code.trim().length < 4) {
      toast({
        variant: "destructive",
        title: "Code fehlt",
        description: "Bitte gib den 6-stelligen Code aus der SMS ein.",
      });
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: code.trim(),
        type: "sms",
      });
      if (error) throw error;
      toast({ title: "Erfolgreich angemeldet" });
      navigate("/");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: err.message ?? "Code ungültig oder abgelaufen.",
      });
    } finally {
      setVerifying(false);
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
          {step === "form" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Du bekommst gleich eine SMS mit deinem Bestätigungscode.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={requesting}>
                {requesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Code per SMS anfordern
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ob-code">SMS-Code</Label>
                <Input
                  id="ob-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="z.B. 123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Der Code wurde an {phone} gesendet.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Anmelden
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("form");
                  setCode("");
                }}
              >
                Zurück
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
