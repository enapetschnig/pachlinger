import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Anmelden",
        description: error.message,
      });
      setLoading(false);
      return;
    }

    toast({ title: "Erfolgreich angemeldet" });
    navigate("/");
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("reset-email") as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({ variant: "destructive", title: "Fehler", description: error.message });
    } else {
      toast({
        title: "E-Mail gesendet",
        description: "Prüfen Sie Ihr Postfach für den Passwort-Reset-Link.",
      });
      setShowPasswordReset(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo size="lg" />
          </div>
          <CardDescription>Lieferscheine erstellen und verwalten</CardDescription>
        </CardHeader>
        <CardContent>
          {showPasswordReset ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Passwort zurücksetzen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Geben Sie Ihre E-Mail-Adresse ein, um einen Reset-Link zu erhalten.
                </p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-Mail</Label>
                  <Input id="reset-email" name="reset-email" type="email" placeholder="ihre@email.at" required />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Lädt..." : "Reset-Link senden"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowPasswordReset(false)}
                >
                  Zurück zur Anmeldung
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ihre@email.at"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Passwort vergessen?
                </button>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Lädt..." : "Anmelden"}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                Mitarbeiter erhalten ihre Einladung per SMS und müssen sich nicht selbst registrieren.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
